import uuid = require('uuid/v4')
import { AlreadyExistsError } from '../utils/error/AlreadyExistsError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { Column } from './column'
import { Table } from './table'

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
   * Add Table to the Database
   * @param name [string]
   * @param columns [Array<Column>]
   * @param ifNotExists [boolean] Suppress error if the Table with the same name exists
   */
  public createTable(name: string, columns: Column[], ifNotExists: true): Table|undefined

  public createTable(name: string, columns: Column[], ifNotExists?: true): Table|undefined {
    try {
      this.getTable(name)
      if (!ifNotExists) throw new AlreadyExistsError(`Table '${name}' already exists in Database '${this.name}'`)
    }
    catch (e) {
      if (e instanceof NotFoundError) {
        if (!columns.length) throw new SyntaxError('A Table must have at least 1 Column')
        const table = new Table(new Table(name), this)
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
  public dropTable(nameOrKey: string): Table

  /**
   * Remove the Table with the given name or the given key from the Database
   * @param nameOrKey [string]
   * @param ifExists [boolean] Suppress error if the Table does not exist
   */
  public dropTable(nameOrKey: string, ifExists: true): Table|undefined

  public dropTable(nameOrKey: string, ifExists?: true): Table|undefined {
    try {
      const table = this.getTable(nameOrKey)
      delete this.tablesMapping[table.key]
      return table
    }
    catch (e) {
      if (!ifExists) throw e
    }
  }

  /**
   * Check whether the two Database instances are the same
   * @param database [Database]
   */
  public equals(database: Database): boolean  {
    return this === database || this.key === database.key
  }
}
