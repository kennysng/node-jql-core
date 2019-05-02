import uuid = require('uuid/v4')
import { AlreadyExistsError } from '../utils/error/AlreadyExistsError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { Column } from './column'
import { Database } from './database'

export class Table {
  public name: string
  public readonly key: string
  public readonly databaseKey?: string

  protected readonly columnsMapping: { [key: string]: Column } = {}
  protected readonly columnsOrder: string[] = []

  /**
   * Create a clean Table
   * @param name [string]
   * @param key [string]
   */
  constructor(name: string, key?: string)

  /**
   * Bind a Table to a Database, or unbind a Table
   * @param table [Table]
   * @param database [Database]
   */
  constructor(table: Table, database?: Database)

  constructor(...args: any[]) {
    let name: string, key: string
    if (args[0] instanceof Table) {
      const table = args[0] as Table
      name = table.name
      key = table.key
      if (args[1]) this.databaseKey = (args[1] as Database).key
      for (const column of table.columns) this.addColumn(column)
    }
    else {
      name = args[0]
      key = args[1] || uuid()
    }

    this.name = name
    this.key = key
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'Table'
  }

  /**
   * Check whether the Table is binded to a Database
   */
  get isBinded(): boolean {
    return !!this.databaseKey
  }

  /**
   * List the Columns in this Table
   */
  get columns(): Column[] {
    return this.columnsOrder.map(key => this.columnsMapping[key])
  }

  /**
   * Get SQL string of the Column
   */
  get sql(): string {
    return `CREATE TABLE IF NOT EXISTS \`${this.name}\` (${this.columns.map(column => column.sql).join(', ')})`
  }

  /**
   * Get the Column with the given name or the given key
   * @param nameOrKey [string] Column name or Column key
   */
  public getColumn(nameOrKey: string): Column {
    const column = this.columnsMapping[nameOrKey] || this.columns.find(column => column.name === nameOrKey)
    if (!column) throw new NotFoundError(`Column '${nameOrKey}' not found in Table '${this.name}'`)
    return column
  }

  /**
   * Add Column to the Table
   * @param column [Column]
   */
  public addColumn(column: Column): Column {
    try {
      this.getColumn(column.name)
      throw new AlreadyExistsError(`Column '${column.name}' already exists in Table '${this.name}'`)
    }
    catch (e) {
      if (e instanceof NotFoundError) {
        column = new Column(column, this)
        this.columnsMapping[column.key] = column
        this.columnsOrder.push(column.key)
        return column
      }
      throw e
    }
  }

  /**
   * Remove the Column with the given name or the given key from the Table
   * @param nameOrKey [string] Column name or Column key
   */
  public removeColumn(nameOrKey: string): Column {
    const column = this.getColumn(nameOrKey)
    delete this.columnsMapping[column.key]
    this.columnsOrder.splice(this.columnsOrder.indexOf(column.key), 1)
    return new Column(column)
  }

  /**
   * Combine the columns of multiple Tables
   * @param tables [Array<TempTable>]
   */
  public combine(...tables: Table[]): Table

  /**
   * Combine the columns of multiple Tables
   * @param name [string] The new Table name
   * @param tables [Array<Table>]
   */
  public combine(name: string, ...tables: Table[]): Table

  public combine(...args: any[]): Table {
    let name: string, tables: Table[]
    if (typeof args[0] === 'string') {
      name = args[0]
      tables = args.slice(1)
    }
    else {
      tables = args
      name = tables.reduce((name, table) => `${name}+${table.name}`, this.name)
    }
    tables.unshift(this)

    const newTable = new Table(name)
    for (const table of tables) {
      for (const column of table.columns) newTable.addColumn(column)
    }
    return newTable
  }

  /**
   * For generating alias table
   * @param name [string]
   */
  public clone(name: string): Table {
    const table = new Table(this)
    table.name = name
    return table
  }

  /**
   * Check whether the two Table instances are the same
   * @param table [Table]
   */
  public equals(table: Table): boolean  {
    return this === table || this.key === table.key
  }
}
