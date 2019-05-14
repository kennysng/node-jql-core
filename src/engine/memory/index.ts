import { Query } from 'node-jql'
import { IDataSource, IQueryResult, IResult, IRow } from '../../core/interfaces'
import { Functions } from '../../function/functions'
import { Column, Database, Schema, Table } from '../../schema'
import { NoDatabaseSelectedError } from '../../utils/error/NoDatabaseSelectedError'
import { ReadWriteLock, ReadWriteLocks } from '../../utils/lock'
import { DatabaseEngine } from '../core'
import { CompiledQuery } from '../core/query'
import { Sandbox } from '../core/sandbox'

export class InMemoryEngine extends DatabaseEngine {
  protected readonly schema = new Schema()
  protected readonly context: IDataSource = {}
  protected readonly functions = new Functions()

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
          throw e
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
          throw e
        }
      })
      .then(() => ({ time: Date.now() - base }))
  }

  // @override
  public query(query: Query, ...args: any[]): Promise<IQueryResult>

  // @override
  public query(databaseNameOrKey: string, query: Query, ...args: any[]): Promise<IQueryResult>

  public query(...args: any[]): Promise<IQueryResult> {
    let databaseNameOrKey: string|undefined, query: Query|CompiledQuery, args_: any[]
    if (typeof args[0] === 'string') {
      databaseNameOrKey = args[0]
      query = args[1]
      args_ = args.slice(2)
    }
    else {
      query = args[0]
      args_ = args.slice(1)
    }

    const base = Date.now()
    if (query instanceof Query) {
      query = new CompiledQuery(query, {
        defaultDatabase: databaseNameOrKey,
        functions: new Functions(this.functions),
        schema: this.getSchema(),
      })
      for (let i = 0, length = args_.length; i < length; i += 1) query.setArg(i, args_[i])
    }
    const sql = query.toString()
    const compiled: CompiledQuery = query
    return Promise.all(compiled.tables.map(key => this.tableLocks.startReading(key)))
      .then(() => new Sandbox(this).run(compiled))
      .then(result => {
        for (const key of compiled.tables) this.tableLocks.endReading(key)
        return { ...result, sql, time: Date.now() - base }
      })
      .catch(e => {
        for (const key of compiled.tables) this.tableLocks.endReading(key)
        throw e
      })
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
          throw e
        }
      })
      .then(() => ({ time: Date.now() - base }))
  }

  // @override
  public getContext(databaseNameOrKey: string, tableNameOrKey: string): IRow[]
  public getContext(databaseNameOrKey: string, tableNameOrKey: string, rowIndex: number): IRow
  public getContext(databaseNameOrKey: string, tableNameOrKey: string, rowIndex?: number): IRow|IRow[] {
    const database = this.getSchema().getDatabase(databaseNameOrKey)
    const table = database.getTable(tableNameOrKey)
    return rowIndex === undefined ? this.context[database.key][table.key] : this.context[database.key][table.key][rowIndex]
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
