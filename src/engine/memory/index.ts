import { Query } from 'node-jql'
import { DatabaseCore } from '../../core'
import { Connection } from '../../core/connection'
import { IDataSource, IQueryResult, IResult, IRow } from '../../core/interfaces'
import { Schema } from '../../schema'
import { Column } from '../../schema/column'
import { Database } from '../../schema/database'
import { Table } from '../../schema/table'
import { NoDatabaseSelectedError } from '../../utils/error/NoDatabaseSelectedError'
import { ReadWriteLock, ReadWriteLocks } from '../../utils/lock'
import { DatabaseEngine } from '../core'
import { CompiledQuery, PreparedQuery } from '../core/query'
import { Sandbox } from '../core/sandbox'
import { InMemoryTransaction } from './transaction'

export class InMemoryEngine extends DatabaseEngine {
  protected readonly schema = new Schema()
  protected readonly context: IDataSource = {}

  private readonly schemaLock = new ReadWriteLock()
  private readonly databaseLocks = new ReadWriteLocks()
  private readonly tableLocks = new ReadWriteLocks()

  // @override
  get [Symbol.toStringTag](): string {
    return 'InMemoryEngine'
  }

  // @override
  public getSchema(): Schema {
    return this.schema
  }

  // @override
  public updateSchema(schema: Schema): void {
    // no use for InMemoryEngine as the one and only one Schema is always in the memory
  }

  // @override
  public getDatabase(nameOrKey: string): Promise<Database> {
    return this.schemaLock.startReading()
      .then(() => this.getSchema())
      .then(schema => {
        try {
          return schema.getDatabase(nameOrKey)
        }
        finally {
          this.schemaLock.endReading()
        }
      })
  }

  // @override
  public getTable(databaseNameOrKey: string, nameOrKey: string): Promise<Table> {
    return this.schemaLock.startReading()
      .then(() => {
        try {
          const database = this.getSchema().getDatabase(databaseNameOrKey)
          return this.databaseLocks.startReading(database.key).then(() => database)
        }
        finally {
          this.schemaLock.endReading()
        }
      })
      .then(database => {
        try {
          return database.getTable(nameOrKey)
        }
        finally {
          this.databaseLocks.endReading(database.key)
        }
      })
  }

  // @override
  public getCount(databaseNameOrKey: string, nameOrKey: string): number|Promise<number> {
    return this.getTable(databaseNameOrKey, nameOrKey)
      .then(table => this.tableLocks.startReading(table.key).then(() => table))
      .then(table => {
        try {
          if (!table.databaseKey) throw new NoDatabaseSelectedError()
          const rows = this.context[table.databaseKey][table.key]
          return rows.length
        }
        finally {
          this.tableLocks.endReading(table.key)
        }
      })
  }

  // @override
  public createDatabase(name: string, ifNotExists?: true): Promise<IResult> {
    const base = Date.now()
    return this.schemaLock.startWriting()
      .then(() => {
        try {
          const database = this.schema.createDatabase(name)
          this.setContext(database.key, {})
        }
        catch (e) {
          if (!ifNotExists) throw e
        }
        finally {
          this.schemaLock.endWriting()
        }
      })
      .then(() => ({ time: Date.now() - base }))
  }

  // @override
  public renameDatabase(name: string, newName: string): Promise<IResult> {
    const base = Date.now()
    return this.schemaLock.startReading()
      .then(() => {
        try {
          const database = this.getSchema().getDatabase(name)
          return this.databaseLocks.startWriting(database.key).then(() => database)
        }
        finally {
          this.schemaLock.endReading()
        }
      })
      .then(database => {
        database.name = newName
        this.databaseLocks.endWriting(database.key)
      })
      .then(() => ({ time: Date.now() - base }))
  }

  // @override
  public dropDatabase(databaseNameOrKey: string, ifExists?: true): Promise<IResult> {
    const base = Date.now()
    return this.schemaLock.startWriting()
      .then(() => {
        const database = this.getSchema().getDatabase(databaseNameOrKey)
        return this.databaseLocks.startWriting(database.key).then(() => database)
      })
      .then(database => {
        try {
          this.setContext(database.key)
          this.getSchema().dropDatabase(database.key)
        }
        catch (e) {
          if (!ifExists) throw e
        }
        finally {
          this.databaseLocks.endWriting(database.key)
          this.schemaLock.endWriting()
        }
      })
      .then(() => ({ time: Date.now() - base }))
  }

  // @override
  public createTable(databaseNameOrKey: string, name: string, columns: Column[], ifNotExists?: true): Promise<IResult> {
    const base = Date.now()
    return this.schemaLock.startReading()
      .then(() => {
        try {
          const database = this.getSchema().getDatabase(databaseNameOrKey)
          return this.databaseLocks.startWriting(database.key).then(() => database)
        }
        finally {
          this.schemaLock.endReading()
        }
      })
      .then(database => {
        try {
          const table = database.createTable(name, columns)
          this.setContext(database.key, table.key, [])
        }
        catch (e) {
          if (!ifNotExists) throw e
        }
        finally {
          this.databaseLocks.endWriting(database.key)
        }
      })
      .then(() => ({ time: Date.now() - base }))
  }

  // @override
  public renameTable(databaseNameOrKey: string, name: string, newName: string): Promise<IResult> {
    const base = Date.now()
    return this.schemaLock.startReading()
      .then(() => {
        try {
          const database = this.getSchema().getDatabase(databaseNameOrKey)
          return this.databaseLocks.startReading(database.key).then(() => database)
        }
        finally {
          this.schemaLock.endReading()
        }
      })
      .then(database => {
        try {
          const table = database.getTable(name)
          return this.tableLocks.startWriting(table.key)
            .then(() => {
              try {
                table.name = newName
                this.tableLocks.endWriting(table.key)
              }
              finally {
                this.databaseLocks.endReading(database.key)
              }
            })
        }
        catch (e) {
          this.databaseLocks.endReading(database.key)
        }
      })
      .then(() => ({ time: Date.now() - base }))
  }

  // @override
  public dropTable(databaseNameOrKey: string, name: string, ifExists?: true): Promise<IResult> {
    const base = Date.now()
    return this.schemaLock.startReading()
      .then(() => {
        try {
          const database = this.getSchema().getDatabase(databaseNameOrKey)
          return this.databaseLocks.startWriting(database.key).then(() => database)
        }
        finally {
          this.schemaLock.endReading()
        }
      })
      .then(database => {
        try {
          const table = database.getTable(name)
          return this.tableLocks.startWriting(table.key)
            .then(() => {
              try {
                this.setContext(database.key, table.key)
                database.dropTable(name)
              }
              catch (e) {
                if (!ifExists) throw e
              }
              finally {
                this.tableLocks.endWriting(table.key)
                this.databaseLocks.endWriting(database.key)
              }
            })
        }
        catch (e) {
          this.databaseLocks.endWriting(database.key)
        }
      })
      .then(() => ({ time: Date.now() - base }))
  }

  // @override
  public prepare(query: Query): Promise<PreparedQuery> {
    return this.schemaLock.startReading()
      .then(() => {
        try {
          return super.prepare(query) as PreparedQuery
        }
        finally {
          this.schemaLock.endReading()
        }
      })
  }

  // @override
  public query(databaseNameOrKey: string, query: Query, ...args: any[]): Promise<IQueryResult>

  // @override
  public query(databaseNameOrKey: string, query: CompiledQuery): Promise<IQueryResult>

  public query(databaseNameOrKey: string, query: Query|CompiledQuery, ...args: any[]): Promise<IQueryResult> {
    const base = Date.now()
    if (query instanceof Query) {
      return this.prepare(query)
        .then(preparedQuery => {
          for (let i = 0, length = args.length; i < length; i += 1) preparedQuery.setArg(i, args[i])
          return preparedQuery.execute(databaseNameOrKey)
        })
        .then(result => ({ ...result, time: Date.now() - base }))
    }
    return Promise.all(query.tables.map(({ key }) => this.tableLocks.startReading(key)))
      .then(() => new Sandbox(databaseNameOrKey, this).run(query))
      .then(result => ({ ...result, time: Date.now() - base }))
  }

  // @override
  public insertInto(databaseNameOrKey: string, name: string, values: IRow[]): Promise<IResult> {
    const base = Date.now()
    return this.schemaLock.startReading()
      .then(() => {
        try {
          const database = this.getSchema().getDatabase(databaseNameOrKey)
          return this.databaseLocks.startReading(database.key).then(() => database)
        }
        finally {
          this.schemaLock.endReading()
        }
      })
      .then(database => {
        try {
          const table = database.getTable(name)
          return this.tableLocks.startWriting(table.key)
            .then(() => {
              try {
                this.setContext(databaseNameOrKey, name, values.map(row => {
                  const result = {}
                  for (const column of table.columns) {
                    result[column.key] = column.validate(row[column.name])
                  }
                  return result
                }))
                return this.tableLocks.endWriting(table.key)
              }
              finally {
                this.databaseLocks.endReading(database.key)
              }
            })
        }
        catch (e) {
          this.databaseLocks.endReading(database.key)
        }
      })
      .then(() => ({ time: Date.now() - base }))
  }

  // @override
  public startTransaction(connection: Connection, core: DatabaseCore): InMemoryTransaction {
    return new InMemoryTransaction(connection, core)
  }

  // @override
  public commitTransaction(transaction: InMemoryTransaction): Promise<IResult> {
    // TODO
    return Promise.resolve({ time: 0 })
  }

  // @override
  public getContext(databaseNameOrKey: string, tableNameOrKey: string, rowIndex: number): IRow {
    const database = this.getSchema().getDatabase(databaseNameOrKey)
    const table = database.getTable(tableNameOrKey)
    return this.context[database.key][table.key][rowIndex]
  }

  // @override
  public setContext(databaseNameOrKey: string, value?: { [key: string]: IRow[] }): void

  // @override
  public setContext(databaseNameOrKey: string, tableNameOrKey: string, value?: IRow[]): void

  public setContext(databaseNameOrKey: string, ...args: any[]): void {
    const database = this.getSchema().getDatabase(databaseNameOrKey)
    if (typeof args[0] === 'string') {
      const table = database.getTable(args[0])
      this.context[database.key][table.key] = args[1]
    }
    else {
      this.context[database.key] = args[0]
    }
  }
}
