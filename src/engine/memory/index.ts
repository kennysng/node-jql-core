import { Query } from 'node-jql'
import uuid = require('uuid/v4')
import { IDatabaseOptions, TEMP_DB_KEY } from '../../core'
import { IDataSource, IPredictResult, IQueryResult, IResult, IRow } from '../../core/interfaces'
import { Functions } from '../../function/functions'
import { Column, Database, Schema, Table } from '../../schema'
import { NoDatabaseSelectedError } from '../../utils/error/NoDatabaseSelectedError'
import gc = require('../../utils/gc')
import { ReadWriteLock, ReadWriteLocks } from '../../utils/lock'
import { DatabaseEngine, IPreparedQuery, IRunningQuery } from '../core'
import { CompiledQuery } from './query'
import { Sandbox } from './sandbox'

export class InMemoryEngine extends DatabaseEngine {
  protected readonly schema = new Schema()
  protected readonly context: IDataSource = {}
  protected readonly functions = new Functions()

  private readonly schemaLock = new ReadWriteLock()
  private readonly databaseLocks = new ReadWriteLocks()
  private readonly tableLocks = new ReadWriteLocks()

  constructor(public readonly options?: IDatabaseOptions) {
    super()
  }

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
  public async getDatabase(nameOrKey: string): Promise<Database> {
    await this.schemaLock.startReading()
    try {
      const schema = this.getSchema()
      return schema.getDatabase(nameOrKey)
    }
    finally {
      this.schemaLock.endReading()
    }
  }

  // @override
  public async getTable(databaseNameOrKey: string, nameOrKey: string): Promise<Table> {
    // read schema to get database
    await this.schemaLock.startReading()
    let database: Database
    try {
      database = this.getSchema().getDatabase(databaseNameOrKey)
    }
    finally {
      this.schemaLock.endReading()
    }

    // read database to get table
    await this.databaseLocks.startReading(database.key)
    try {
      return database.getTable(nameOrKey)
    }
    finally {
      this.databaseLocks.endReading(database.key)
    }
  }

  // @override
  public async getCount(databaseNameOrKey: string, nameOrKey: string): Promise<number> {
    const table = await this.getTable(databaseNameOrKey, nameOrKey)
    if (!table.databaseKey) throw new NoDatabaseSelectedError()

    await this.tableLocks.startReading(table.key)
    try {
      const rows = this.context[table.databaseKey][table.key]
      return rows.length
    }
    finally {
      this.tableLocks.endReading(table.key)
    }
  }

  // @override
  public async createDatabase(name: string, ifNotExists?: true): Promise<IResult> {
    const base = Date.now()

    await this.schemaLock.startWriting()
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

    return { time: Date.now() - base }
  }

  // @override
  public async renameDatabase(name: string, newName: string): Promise<IResult> {
    const base = Date.now()

    // read schema to get database
    await this.schemaLock.startReading()
    let database: Database
    try {
      database = this.getSchema().getDatabase(name)
      await this.databaseLocks.startWriting(database.key)
    }
    finally {
      this.schemaLock.endReading()
    }

    // rename database
    database.name = newName
    this.databaseLocks.endWriting(database.key)

    return { time: Date.now() - base }
  }

  // @override
  public async dropDatabase(databaseNameOrKey: string, ifExists?: true): Promise<IResult> {
    const base = Date.now()

    // lock schema & database
    await this.schemaLock.startWriting()
    let database: Database
    try {
      database = this.getSchema().getDatabase(databaseNameOrKey)
      await this.databaseLocks.startWriting(database.key)
    }
    catch (e) {
      this.schemaLock.endWriting()
      throw e
    }

    // drop database
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

    return { time: Date.now() - base }
  }

  // @override
  public async createTable(databaseNameOrKey: string, name: string, columns: Column[], ifNotExists?: true): Promise<IResult> {
    const base = Date.now()

    // read schema to get database
    await this.schemaLock.startReading()
    let database: Database
    try {
      database = this.getSchema().getDatabase(databaseNameOrKey)
      await this.databaseLocks.startWriting(database.key)
    }
    finally {
      this.schemaLock.endReading()
    }

    // create table
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

    return { time: Date.now() - base }
  }

  // @override
  public async renameTable(databaseNameOrKey: string, name: string, newName: string): Promise<IResult> {
    const base = Date.now()

    // read schema to get database
    await this.schemaLock.startReading()
    let database: Database
    try {
      database = this.getSchema().getDatabase(databaseNameOrKey)
      await this.databaseLocks.startReading(database.key)
    }
    finally {
      this.schemaLock.endReading()
    }

    // rename table
    try {
      const table = database.getTable(name)
      await this.tableLocks.startWriting(table.key)
      table.name = newName
      this.tableLocks.endWriting(table.key)
    }
    finally {
      this.databaseLocks.endReading(database.key)
    }

    return { time: Date.now() - base }
  }

  // @override
  public async dropTable(databaseNameOrKey: string, name: string, ifExists?: true): Promise<IResult> {
    const base = Date.now()

    // read schema to get database
    await this.schemaLock.startReading()
    let database: Database
    try {
      database = this.getSchema().getDatabase(databaseNameOrKey)
      await this.databaseLocks.startWriting(database.key)
    }
    finally {
      this.schemaLock.endReading()
    }

    // drop table
    try {
      const table = database.getTable(name)
      await this.tableLocks.startWriting(table.key)
      try {
        this.setContext(database.key, table.key)
        database.dropTable(name)
      }
      catch (e) {
        if (!ifExists) throw e
      }
      finally {
        this.tableLocks.endWriting(table.key)
      }
    }
    finally {
      this.databaseLocks.endWriting(database.key)
    }

    // force garbage collection
    gc()

    return { time: Date.now() - base }
  }

  // @override
  public query(query: Query|IPreparedQuery|Array<Query|IPreparedQuery>): Promise<IQueryResult>

  // @override
  public query(databaseNameOrKey: string, query: Query|IPreparedQuery|Array<Query|IPreparedQuery>): Promise<IQueryResult>

  public async query(...args: any[]): Promise<IQueryResult > {
    let databaseNameOrKey: string|undefined, queries: Query|IPreparedQuery|Array<Query|IPreparedQuery>
    if (typeof args[0] === 'string') {
      databaseNameOrKey = args[0]
      queries = args[1]
    }
    else {
      queries = args[0]
    }

    if (!Array.isArray(queries)) return await (databaseNameOrKey ? this.query(databaseNameOrKey, [queries]) : this.query([queries]))

    const base = Date.now()

    const runningQuery: Partial<IRunningQuery> = { id: this.lastQueryId = uuid() }
    this.runningQueries.push(runningQuery as IRunningQuery)
    let result: IQueryResult = { mappings: [], data: [], time: Date.now() - base }
    const sandbox = new Sandbox(this)
    const sqls: string[] = []
    try {
      for (let query_ of queries) {
        if (query_ instanceof Query) query_ = { query: query_ }
        const { query, args = [] } = query_
        const compiled = new CompiledQuery(query, {
          databaseOptions: this.options,
          defaultDatabase: databaseNameOrKey,
          functions: new Functions(this.functions),
          schema: this.getSchema(),
          sandbox,
        })
        for (let i = 0, length = args.length; i < length; i += 1) compiled.setArg(i, args[i])
        sqls.push(runningQuery.sql = compiled.toString())
        const promise = runningQuery.promise = sandbox.run(compiled)
        const lockPromises = compiled.tables.map(key => this.tableLocks.startReading(key))
        try {
          await Promise.all(lockPromises)
          result = await promise
        }
        finally {
          for (const key of compiled.tables) this.tableLocks.endReading(key)

          // force garbage collection
          gc()
        }
      }
      return { ...result, sql: sqls.join('; '), time: Date.now() - base }
    }
    finally {
      if (runningQuery) {
        const index = this.runningQueries.findIndex(({ id }) => id === (runningQuery as IRunningQuery).id)
        if (index > -1) this.runningQueries.splice(index, 1)
      }
    }
  }

  // @override
  public predict(query: Query|Query[]): Promise<IPredictResult>

  // @override
  public predict(databaseNameOrKey: string, query: Query|Query[]): Promise<IPredictResult>

  public async predict(...args: any[]): Promise<IPredictResult> {
    let databaseNameOrKey: string|undefined, queries: Query|Query[]
    if (typeof args[0] === 'string') {
      databaseNameOrKey = args[0]
      queries = args[1]
    }
    else {
      queries = args[0]
    }

    if (!Array.isArray(queries)) return await (databaseNameOrKey ? this.predict(databaseNameOrKey, [queries]) : this.predict([queries]))

    const base = Date.now()
    const sandbox = new Sandbox(this)
    try {
      const compiled = queries.map(query => new CompiledQuery(query, {
        databaseOptions: this.options,
        defaultDatabase: databaseNameOrKey,
        functions: new Functions(this.functions),
        schema: this.getSchema(),
        sandbox,
      }))
      return {
        columns: compiled[compiled.length - 1].structure.columns.map(({ name, type }) => ({ name, type })),
        time: Date.now() - base,
        sql: compiled.map(query => query.toString()).join('; '),
      }
    }
    finally {
      gc()
    }
  }

  // @override
  public cancel(sqlId: string): void {
    const runningQuery = this.runningQueries.find(({ id }) => id === sqlId)
    if (runningQuery) runningQuery.promise.cancel()
  }

  // @override
  public async insertInto(databaseNameOrKey: string, name: string, values: IRow[]): Promise<IResult> {
    const base = Date.now()

    // read schema to get database
    await this.schemaLock.startReading()
    let database: Database
    try {
      database = this.getSchema().getDatabase(databaseNameOrKey)
      await this.databaseLocks.startReading(database.key)
    }
    finally {
      this.schemaLock.endReading()
    }

    // insert data
    try {
      const table = database.getTable(name)
      await this.tableLocks.startWriting(table.key)
      try {
        this.setContext(databaseNameOrKey, name, values.map(row => {
          const result = {}
          for (const column of table.columns) {
            result[column.key] = column.validate(row[column.name])
          }
          return result
        }))
      }
      finally {
        this.tableLocks.endWriting(table.key)
      }
    }
    finally {
      this.databaseLocks.endReading(database.key)
    }

    // force garbage collection
    gc()

    return { time: Date.now() - base }
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
