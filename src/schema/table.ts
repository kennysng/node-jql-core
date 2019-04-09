import uuid = require('uuid/v4')
import { AlreadyExistsError } from '../utils/error/AlreadyExistsError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { Logger } from '../utils/logger'
import { Column } from './column'
import { Database } from './database'

const logger = new Logger(__filename)

/**
 * Base Table structure
 */
export class TempTable {
  public readonly name: string

  protected readonly columnsMapping: { [key: string]: Column } = {}
  protected readonly columnsOrder: string[] = []

  /**
   * Create a clean TempTable
   * @param name [string]
   *
   * Clone from a given TempTable
   * @param table [TempTable]
   */
  constructor(nameOrTable: string | TempTable) {
    if (typeof nameOrTable === 'string') {
      this.name = nameOrTable
    }
    else {
      this.name = nameOrTable.name
      for (const column of nameOrTable.columns) this.addColumn(column)
    }
  }

  /**
   * List the Columns in this Table
   */
  get columns(): Column[] {
    return this.columnsOrder.map(key => this.columnsMapping[key])
  }

  // @override
  get [Symbol.toStringTag]() {
    return 'TempTable'
  }

  /**
   * Get the Column with the given name
   * @param name [string] Column name
   * @param options [IGetColumnOptions]
   */
  public getColumn(name: string): Column {
    const column = this.columns.find(column => column.name === name)
    if (!column) throw new NotFoundError(`Column '${name}' not found in Table '${this.name}'`)
    return column
  }

  /**
   * Add Column to the Table
   * @param column [Column]
   */
  public addColumn(column: Column): TempTable {
    try {
      this.getColumn(column.name)
      throw new AlreadyExistsError(`Column '${column.name}' already exists in Table '${this.name}'`)
    }
    catch (e) {
      if (e instanceof NotFoundError) {
        column = new Column(this, column)
        this.columnsMapping[column.key] = column
        this.columnsOrder.push(column.key)
        return this
      }
      throw e
    }
  }

  /**
   * Remove the Column with the given name from the Table
   * @param name [string]
   */
  public removeColumn(name: string): Column {
    const column = this.getColumn(name)
    delete this.columnsMapping[column.key]
    this.columnsOrder.splice(this.columnsOrder.indexOf(column.key), 1)
    return column.clone()
  }

  /**
   * Combine the properties of multiple Tables
   * @param tables [Array<TempTable>]
   */
  public combine(...tables: TempTable[]): TempTable
  public combine(name: string, ...tables: TempTable[]): TempTable
  public combine(...args: any[]): TempTable {
    let name: string, tables: TempTable[]
    if (typeof args[0] === 'string') {
      const [name_, ...tables_] = args
      name = name_
      tables = tables_
    }
    else {
      tables = args
      name = tables.reduce((name, table) => `${name}+${table.name}`, this.name)
    }

    const result = this.clone(name)
    for (const table of tables) {
      for (const column of table.columns) result.addColumn(column)
    }
    return result
  }

  /**
   * Clone the Table, maybe with a new name
   * @param name [string] the new Table name
   */
  public clone(name = this.name): TempTable {
    const result = new TempTable(name)
    for (const column of this.columns) result.addColumn(column)
    return result
  }
}

/**
 * Define the properties of a Table
 */
export class Table extends TempTable {
  public readonly key: string
  public readonly database?: Database

  /**
   * Create a Table from TempTable
   * @param table [TempTable]
   */
  constructor(table: TempTable)

  /**
   * Create a clean Table
   * @param name [string]
   * @param key [string]
   */
  constructor(name: string, key?: string)

  /**
   * Bind the Table to a Database
   * @param database [Database]
   * @param table [Table]
   */
  constructor(database: Database, table: Table)

  constructor(...args: any[]) {
    super(args[0] instanceof TempTable || typeof args[0] === 'string' ? args[0] : args[1] as Table)
    let key: string, database: Database | undefined
    switch (args.length) {
      case 1:
        key = uuid()
        break
      case 2:
      default:
        if (typeof args[0] === 'string') {
          key = args[1] || uuid()
        }
        else {
          database = args[0]
          key = (args[1] as Table).key
        }
    }

    this.key = key
    this.database = database
  }

  /**
   * Whether the Table is binded to a Database
   */
  get binded(): boolean {
    return !!this.database
  }

  // @override
  get [Symbol.toStringTag]() {
    return 'Table'
  }

  // @override
  public addColumn(column: Column): Table {
    super.addColumn(column)
    logger.info(`ALTER TABLE \`${this.name}\` ADD \`${column.name}\` ${column.type}`)
    return this
  }

  // @override
  public removeColumn(name: string): Column {
    const result = super.removeColumn(name)
    logger.info(`ALTER TABLE \`${this.name}\` DROP COLUMN \`${result.name}\``)
    return result
  }

  // @override
  public combine(...tables: Table[]): Table
  public combine(name: string, ...tables: Table[]): Table
  public combine(...args: any[]): Table {
    return new Table(super.combine(...args))
  }

  // @override
  public clone(name = this.name): Table {
    const result = new Table(name, this.key)
    for (const column of this.columns) result.addColumn(column)
    return result
  }

  /**
   * Check whether the two Table instances are the same
   * @param table [Table]
   */
  public equals(table: Table): boolean  {
    return this.name === table.name && this.key === table.key
  }
}
