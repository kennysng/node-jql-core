import { AlreadyExistsError } from '../utils/error/AlreadyExistsError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { Database } from './database'

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
