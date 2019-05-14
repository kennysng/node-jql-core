import _ = require('lodash')
import moment = require('moment')
import { defaults, normalize, Type } from 'node-jql'
import uuid = require('uuid/v4')
import { AlreadyExistsError } from './utils/error/AlreadyExistsError'
import { InstantiateError } from './utils/error/InstantiateError'
import { NotFoundError } from './utils/error/NotFoundError'
import isUndefined from './utils/isUndefined'

export class Schema {
  private readonly databasesMapping: { [key: string]: Database } = {}

  // @override
  get [Symbol.toStringTag](): string {
    return 'Schema'
  }

  /**
   * List the Databases in this Schema
   */
  get databases(): Database[] {
    return Object.keys(this.databasesMapping).map(key => this.databasesMapping[key])
  }

  /**
   * Get the Database with the given name or the given key
   * @param nameOrKey [string] Database name or Database key
   */
  public getDatabase(nameOrKey: string): Database {
    const database = this.databasesMapping[nameOrKey] || this.databases.find(schema => schema.name === nameOrKey)
    if (!database) throw new NotFoundError(`Database '${nameOrKey}' not found`)
    return database
  }

  /**
   * Add Database to the Schema. Throw error if the Database with the same name exists
   * @param name [string]
   * @param key [string]
   */
  public createDatabase(name: string, key?: string): Database {
    try {
      if (key && this.databasesMapping[key]) throw new AlreadyExistsError(`Database key '${key}' already in use`)
      this.getDatabase(name)
      throw new AlreadyExistsError(`Database '${name}' already exists`)
    }
    catch (e) {
      if (e instanceof NotFoundError) {
        const database = new Database(name, key)
        return this.databasesMapping[database.key] = database
      }
      throw e
    }
  }

  /**
   * Remove the Database with the given name or the given key from the Schema. Throw error if the Database does not exist
   * @param nameOrKey [string]
   */
  public dropDatabase(nameOrKey: string): Database {
    const database = this.getDatabase(nameOrKey)
    delete this.databasesMapping[database.key]
    return database
  }

  /**
   * Clone the Schema
   */
  public clone(): Schema {
    const newSchema = new Schema()
    for (const database of this.databases) {
      const newDatabase = newSchema.createDatabase(database.name)
      for (const table of database.tables) {
        newDatabase.createTable(table.name, table.columns)
      }
    }
    return newSchema
  }
}

export class Database {
  private readonly tablesMapping: { [key: string]: Table } = {}

  /**
   * Create a clean Database
   * @param name [string]
   * @param key [string]
   */
  constructor(public name: string, public readonly key = uuid()) {
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'Database'
  }

  /**
   * Count the number of Tables in the Database
   */
  get tableCount(): number {
    return Object.keys(this.tablesMapping).length
  }

  /**
   * List the Tables in this Database ordered by Table name
   */
  get tables(): Table[] {
    return Object.keys(this.tablesMapping)
      .map(key => this.tablesMapping[key])
      .sort((l, r) => l.name < r.name ? -1 : l.name > r.name ? 1 : 0)
  }

  /**
   * Get the Table with the given name or given key
   * @param nameOrKey [string] Table name or Table key
   */
  public getTable(nameOrKey: string): Table {
    const table = this.tablesMapping[nameOrKey] || this.tables.find(table => table.name === nameOrKey)
    if (!table) throw new NotFoundError(`Table '${nameOrKey}' not found in Database '${this.name}'`)
    return table
  }

  /**
   * Add Table to the Database. Throw error if the Table with the same name exists
   * @param name [string]
   * @param columns [Array<Column>]
   */
  public createTable(name: string, columns: Column[]): Table

  /**
   * Add Table to the Database. Throw error if the Table with the same name exists
   * @param name [string]
   * @param key [string]
   * @param columns [Array<Column>]
   */
  public createTable(name: string, key: string, columns: Column[]): Table

  public createTable(name: string, ...args: any[]): Table {
    let key: string|undefined, columns: Column[]
    if (typeof args[0] === 'string') {
      key = args[0]
      columns = args[1]
    }
    else {
      columns = args[0]
    }
    try {
      if (key && this.tablesMapping[key]) throw new AlreadyExistsError(`Table key '${key}' already in use`)
      this.getTable(name)
      throw new AlreadyExistsError(`Table '${name}' already exists in Database '${this.name}'`)
    }
    catch (e) {
      if (e instanceof NotFoundError) {
        if (!columns.length) throw new SyntaxError('A Table must have at least 1 Column')
        const table = new Table(new Table(name, key), this)
        for (const column of columns) table.addColumn(column)
        this.tablesMapping[table.key] = table
        return table
      }
      throw e
    }
  }

  /**
   * Remove the Table with the given name or the given key from the Database. Throw error if the Table does not exist
   * @param nameOrKey [string]
   */
  public dropTable(nameOrKey: string): Table {
    const table = this.getTable(nameOrKey)
    delete this.tablesMapping[table.key]
    return table
  }

  /**
   * Check whether the two Database instances are the same
   * @param database [Database]
   */
  public equals(database: Database): boolean  {
    return this === database || this.key === database.key
  }
}

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

/**
 * Extra properties for Column
 */
export interface IColumnOptions {
  default?: any
}

/**
 * Define the properties of a Column
 */
export class Column implements IColumnOptions {
  public readonly name: string
  public readonly type: Type
  public readonly key: string
  public readonly tableKey?: string

  public readonly default: any

  /**
   * Create a clean Column
   * @param name [string]
   * @param type [Type]
   * @param options [IColumnOptions]
   */
  constructor(name: string, type: Type, options?: IColumnOptions)

  /**
   * Create a clean Column with a given key
   * @param name [string]
   * @param type [Type]
   * @param key [string]
   * @param options [IColumnOptions]
   */
  constructor(name: string, type: Type, key: string, options?: IColumnOptions)

  /**
   * Bind a Column to a Table, or unbind a Column
   * @param column [Column]
   * @param table [Table]
   */
  constructor(column: Column, table?: Table)

  constructor(...args: any[]) {
    try {
      let name: string, type: Type, key: string, options: IColumnOptions
      if (args[0] instanceof Column) {
        const column = args[0] as Column
        name = column.name
        type = column.type
        options = column
        if (args[1]) this.tableKey = (args[1] as Table).key
      }
      else {
        name = args[0]
        type = args[1]
      }
      if (typeof args[2] === 'string') {
        key = args[2] || uuid()
        options = args[3] || {}
      }
      else {
        key = uuid()
        options = args[2] || {}
      }

      this.name = name
      this.type = type
      this.key = key
      if (isUndefined(options.default)) options.default = defaults[type]
      Object.assign(this, options)
    }
    catch (e) {
      throw new InstantiateError('Fail to instantiate Column', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'Column'
  }

  /**
   * Check whether the Column is binded to a Table
   */
  get isBinded(): boolean {
    return !!this.tableKey
  }

  /**
   * Get SQL string of the Column
   */
  get sql(): string {
    return `\`${this.name}\` ${this.type}${!isUndefined(this.default) ? ` DEFAULT ${JSON.stringify(this.default)}` : ''}`
  }

  /**
   * Check whether the provided value is suitable to this Column
   * @param value [any] inserted value
   */
  public validate(value: any): any {
    if (isUndefined(value) && !isUndefined(this.default)) value = _.cloneDeep(this.default)
    if (isUndefined(value)) return value
    switch (this.type) {
      case 'any':
        // do nothing
        break
      case 'Date':
        if (!moment.utc(value).isValid()) throw new TypeError(`Invalid date value '${value}' for Column '${this.name}'`)
        break
      case 'string':
      case 'number':
      case 'boolean':
      case 'object':
        const type = typeof value
        if (type !== this.type) throw new TypeError(`Column '${this.name}' expects '${this.type}' but received '${type}'`)
        break
    }
    return normalize(value, this.type)
  }

  /**
   * Check whether the two Column instances are the same
   * @param column [Column]
   */
  public equals(column: Column): boolean {
    return this === column || this.key === column.key
  }
}
