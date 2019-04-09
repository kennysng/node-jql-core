import { AlreadyExistsError } from '../utils/error/AlreadyExistsError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { Database } from './database'
import { Table } from './table'

export class Schema {
  private readonly databasesMapping: { [key: string]: Database } = {}

  /**
   * List the Databases in this Schema
   */
  get databases(): Database[] {
    return Object.keys(this.databasesMapping).map(key => this.databasesMapping[key])
  }

  // @override
  get [Symbol.toStringTag]() {
    return 'Schema'
  }

  /**
   * Get the Database with the given name
   * @param name [string] Database name
   */
  public getDatabase(name: string): Database {
    const database = this.databases.find(schema => schema.name === name)
    if (!database) throw new NotFoundError(`Database '${name}' not found`)
    return database
  }

  /**
   * Add Database to the Schema
   * @param database [Database]
   * @param ifNotExists [boolean] Whether to suppress error if the Database with the same name exists
   */
  public createDatabase(database: Database, ifNotExists = false) {
    try {
      this.getDatabase(database.name)
      if (!ifNotExists) throw new AlreadyExistsError(`Database '${database.name}' already exists`)
    }
    catch (e) {
      if (e instanceof NotFoundError) return this.databasesMapping[database.key] = database
      throw e
    }
  }

  /**
   * Remove the Database with the given name from the Schema
   * @param name [string]
   * @param ifExists [boolean] Whether to suppress error if the Database does not exist
   */
  public dropDatabase(name: string, ifExists = false): Database|undefined {
    try {
      const database = this.getDatabase(name)
      delete this.databasesMapping[database.key]
      return database
    }
    catch (e) {
      if (!ifExists) throw e
    }
  }

  /**
   * Update the Table properties. Should be used when Transaction is committed to the DatabaseCore
   * @param database [Database] Check whether the Database exists in the Schema
   * @param table [Table]
   */
  public updateTable(database: Database, table: Table): Schema {
    database = this.getDatabase(database.name)
    database.updateTable(table)
    return this
  }

  /**
   * Clone databases from another Schema
   */
  public cloneFrom(schema: Schema) {
    for (const database of schema.databases) this.createDatabase(database.clone())
  }
}
