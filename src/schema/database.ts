import uuid = require('uuid/v4')
import { AlreadyExistsError } from '../utils/error/AlreadyExistsError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { Logger } from '../utils/logger'
import { Table } from './table'

const logger = new Logger(__filename)

/**
 * Define the properties of a Database
 */
export class Database {
  private readonly tablesMapping: { [key: string]: Table } = {}

  /**
   * Create a clean Database
   * @param name [string]
   * @param key [string]
   */
  constructor(readonly name: string, readonly key = uuid()) {
  }

  /**
   * List the Tables in this Database
   */
  get tables(): Table[] {
    return Object.keys(this.tablesMapping)
      .map(key => this.tablesMapping[key])
      .sort((l, r) => l.name < r.name ? -1 : l.name > r.name ? 1 : 0)
  }

  /**
   * Count the number of Tables in the Database
   */
  get tableCount(): number {
    return Object.keys(this.tablesMapping).length
  }

  // @override
  get [Symbol.toStringTag]() {
    return 'Database'
  }

  /**
   * Get the Table with the given name
   * @param name [string] Table name
   */
  public getTable(name: string): Table {
    const table = this.tables.find(table => table.name === name)
    if (!table) throw new NotFoundError(`Table '${name}' not found in Database '${this.name}'`)
    return table
  }

  /**
   * Add Table to the Database
   * @param table [Table]
   * @param ifNotExists [boolean] Whether to suppress error if the Table with the same name exists
   */
  public createTable(table: Table, ifNotExists?: boolean): Database {
    this.createTable_(table, ifNotExists)
    logger.info(`CREATE TABLE ${ifNotExists ? 'IF NOT EXISTS ' : ''}\`${this.name}\`.\`${table.name}\``)
    return this
  }

  /**
   * Remove the Table with the given name from the Database
   * @param name [string]
   * @param ifExists [boolean] Whether to suppress error if the Table does not exist
   */
  public dropTable(name: string, ifExists?: boolean): Table|undefined {
    const result = this.dropTable_(name, ifExists)
    logger.info(`DROP TABLE ${ifExists ? 'IF EXISTS ' : ''}\`${this.name}\`.\`${name}\``)
    return result
  }

  /**
   * Update the Table properties. Should be used when Transaction is committed to the DatabaseCore
   * @param table [Table]
   */
  public updateTable(table: Table): Database {
    if (this.getTable(table.name).equals(table)) {
      this.tablesMapping[table.key] = table
    }
    return this
  }

  /**
   * Clone the Database
   */
  public clone(): Database {
    const result = new Database(this.name, this.key)
    for (const table of this.tables) result.createTable_(table)
    return result
  }

  /**
   * Check whether the two Database instances are the same
   * @param database [Database]
   */
  public equals(database: Database): boolean  {
    return this.name === database.name && this.key === database.key
  }

  private createTable_(table: Table, ifNotExists?: boolean) {
    try {
      this.getTable(table.name)
      if (!ifNotExists) throw new AlreadyExistsError(`Table '${table.name}' already exists in Database '${this.name}'`)
    }
    catch (e) {
      if (e instanceof NotFoundError) {
        if (!table.columns.length) throw new SyntaxError('Table must have at least 1 Column')
        table = new Table(this, table)
        return this.tables[table.key] = table
      }
      throw e
    }
  }

  private dropTable_(name: string, ifExists?: boolean): Table|undefined {
    try {
      const table = this.getTable(name)
      delete this.tables[table.key]
      return table
    }
    catch (e) {
      if (!ifExists) throw e
    }
  }
}
