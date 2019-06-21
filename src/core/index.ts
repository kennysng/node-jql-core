import { AxiosInstance } from 'axios'
import { Query } from 'node-jql'
import uuid = require('uuid/v4')
import { DatabaseEngine, IRunningQuery } from '../engine/core'
import { ResultSet } from '../engine/core/cursor/result'
import { InMemoryEngine } from '../engine/memory'
import { Column } from '../schema'
import { AlreadyClosedError } from '../utils/error/AlreadyClosedError'
import { NoDatabaseSelectedError } from '../utils/error/NoDatabaseSelectedError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { Logger } from '../utils/logger'
import { IPredictResult, IResult, IRow } from './interfaces'

export const TEMP_DB_KEY = uuid()

export interface IDatabaseOptions {
  axiosInstance?: AxiosInstance
  logging?: boolean
}

export interface IConnectionOptions extends IDatabaseOptions {
}

/**
 * Main class of the Database
 */
export class DatabaseCore {
  public readonly engine: DatabaseEngine
  public readonly connections: Connection[] = []

  protected readonly options: IDatabaseOptions

  constructor(options?: IDatabaseOptions)
  constructor(engine: DatabaseEngine, options?: IDatabaseOptions)
  constructor(...args: any[]) {
    switch (args.length) {
      case 2:
        this.engine = args[0]
        this.options = args[1] || {}
        break
      default:
        this.options = args[0] || {}
        this.engine = new InMemoryEngine(this.options)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'DatabaseCore'
  }

  /**
   * Create a Connection for access
   * @param useDatabase [string] Default database
   */
  public createConnection(options?: IConnectionOptions): Connection {
    const connection = new Connection(this, Object.assign({}, this.options, options))
    this.connections.push(connection)
    return connection
  }

  /**
   * Drop the Connection
   * @param id [number] The Connection ID
   */
  public closeConnection(id: number): void {
    const index = this.connections.findIndex(connection => connection.id === id)
    if (index === -1) throw new NotFoundError(`Connection #${id} not found`)
    this.connections.splice(index, 1)
  }
}

/**
 * For each client Connection
 */
export class Connection {
  public static count = 0

  public readonly id = ++Connection.count
  public databaseKey?: string
  public closed: boolean = false

  protected readonly logger = new Logger(`[Connection#${this.id}]`)

  constructor(protected readonly core: DatabaseCore, protected readonly options?: IConnectionOptions) {
    if (options && options.logging) this.logger.setEnabled(true)
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'Connection'
  }

  /**
   * Whether the Connection is closed
   */
  get isClosed(): boolean {
    return this.closed
  }

  /**
   * List all running queries
   */
  public get runningQueries(): IRunningQuery[] {
    this.checkClosed()
    return this.core.engine.runningQueries
  }

  /**
   * Get the id of the last running query
   */
  public get lastQueryId(): any {
    this.checkClosed()
    return this.core.engine.lastQueryId
  }

  /**
   * Set default Database
   * @param name [string]
   */
  public async useDatabase(name: string): Promise<IResult> {
    this.checkClosed()
    const base = Date.now()
    const database = await Promise.resolve(this.core.engine.getDatabase(name))
    this.databaseKey = database.key
    const time = Date.now() - base
    this.logger.info(`USE \`${name}\` - ${this.timestamp({ time })}`)
    return { time }
  }

  /**
   * Create a clean Database
   * @param name [string]
   * @param ifNotExists [boolean] Suppress error if the Database with the same name exists
   */
  public async createDatabase(name: string, ifNotExists?: true): Promise<IResult> {
    this.checkClosed()
    const result = await this.core.engine.createDatabase(name, ifNotExists)
    this.logger.info(`CREATE DATABASE${ifNotExists ? ' IF NOT EXISTS' : ''} \`${name}\` - ${this.timestamp(result)}`)
    return result
  }

  /**
   * Rename the Database
   * @param name [string]
   * @param newName [string]
   */
  public async renameDatabase(name: string, newName: string): Promise<IResult> {
    this.checkClosed()
    const result = await this.core.engine.renameDatabase(name, newName)
    this.logger.info(`RENAME DATABASE \`${name}\` TO \`${newName}\` - ${this.timestamp(result)}`)
    return result
  }

  /**
   * Drop the Database
   * @param name [string]
   * @param ifExists [boolean] Suppress error if the Database does not exists
   */
  public async dropDatabase(name: string, ifExists?: true): Promise<IResult> {
    this.checkClosed()
    const result = await this.core.engine.dropDatabase(name, ifExists)
    this.logger.info(`DROP DATABASE${ifExists ? ' IF EXISTS' : ''} \`${name}\` - ${this.timestamp(result)}`)
    return result
  }

  /**
   * Create a clean Table
   * @param name [string]
   * @param columns [Array<Column>]
   * @param ifNotExists [boolean] Suppress error if the Table with the same name exists
   */
  public createTable(name: string, columns: Column[], ifNotExists?: true): Promise<IResult>

  /**
   * Create a clean Table
   * @param databaseName [string]
   * @param name [string]
   * @param columns [Array<Column>]
   * @param ifNotExists [boolean] Suppress error if the Table with the same name exists
   */
  public createTable(databaseName: string, name: string, columns: Column[], ifNotExists?: true): Promise<IResult>

  public async createTable(...args: any[]): Promise<IResult> {
    this.checkClosed()
    let databaseName = this.databaseKey, name: string, columns: Column[], ifNotExists: true | undefined
    if (typeof args[0] === 'string' && typeof args[1] === 'string') {
      databaseName = args[0]
      name = args[1]
      columns = args[2]
      if (args[3]) ifNotExists = args[3]
    }
    else {
      name = args[0]
      columns = args[1]
      if (args[2]) ifNotExists = args[2]
    }
    if (!databaseName) throw new NoDatabaseSelectedError()
    const result = await this.core.engine.createTable(databaseName, name, columns, ifNotExists)
    this.logger.info(`CREATE TABLE${ifNotExists ? ' IF NOT EXISTS' : ''} \`${name}\`(${columns.map(column => column.sql).join(', ')}) - ${this.timestamp(result)}`)
    return result
  }

  // TODO create table as

  /**
   * Rename the Table
   * @param name [string]
   * @param newName [string]
   */
  public renameTable(name: string, newName: string): Promise<IResult>

  /**
   * Rename the Table
   * @param databaseName [string]
   * @param name [string]
   * @param newName [string]
   */
  public renameTable(databaseName: string, name: string, newName: string): Promise<IResult>

  public async renameTable(...args: any[]): Promise<IResult> {
    this.checkClosed()
    let database = this.databaseKey, name: string, newName: string
    if (args.length === 2) {
      name = args[0]
      newName = args[1]
    }
    else {
      database = args[0]
      name = args[1]
      newName = args[2]
    }
    if (!database) throw new NoDatabaseSelectedError()
    const result = await this.core.engine.renameTable(database, name, newName)
    this.logger.info(`RENAME TABLE \`${name}\` TO \`${newName}\` - ${this.timestamp(result)}`)
    return result
  }

  /**
   * Remove the Table
   * @param name [string]
   * @param ifExists [boolean] Suppress error if the Table does not exists
   */
  public dropTable(name: string, ifExists?: true): Promise<IResult>

  /**
   * Remove the Table
   * @param databaseName [string]
   * @param name [string]
   * @param ifExists [boolean] Suppress error if the Table does not exists
   */
  public dropTable(databaseName: string, name: string, ifExists?: true): Promise<IResult>

  public async dropTable(...args: any[]): Promise<IResult> {
    this.checkClosed()
    let database = this.databaseKey, name: string, ifExists: true | undefined
    if (typeof args[0] === 'string' && typeof args[1] === 'string') {
      database = args[0]
      name = args[1]
      if (args[2]) ifExists = args[2]
    }
    else {
      name = args[0]
      if (args[1]) ifExists = args[1]
    }
    if (!database) throw new NoDatabaseSelectedError()
    const result = await this.core.engine.dropTable(database, name, ifExists)
    this.logger.info(`DROP TABLE${ifExists ? ' IF EXISTS' : ''} \`${name}\` - ${this.timestamp(result)}`)
    return result
  }

  /**
   * Run a Query
   * @param query [Query]
   * @param args [Array<any>]
   */
  public async query<T>(query: Query, ...args: any[]): Promise<ResultSet<T>> {
    const result = await (this.databaseKey ? this.core.engine.query(this.databaseKey, query, ...args) : this.core.engine.query(query, ...args))
    this.logger.info(`${result.sql || query.toString()} - length: ${result.data.length} - ${this.timestamp(result)}`)
    return new ResultSet<T>(result)
  }

  /**
   * Predict the result structure of a Query
   * @param query [Query]
   */
  public predict(query: Query): Promise<IPredictResult> {
    return this.databaseKey ? this.core.engine.predict(this.databaseKey, query) : this.core.engine.predict(query)
  }

  /**
   * Insert data into a Table
   * @param name [string]
   * @param values [Array<IRow>]
   */
  public insertInto(name: string, values: IRow[]): Promise<IResult>

  /**
   * Insert data into a Table
   * @param databaseName [string]
   * @param name [string]
   * @param values [Array<IRow>]
   */
  public insertInto(databaseName: string, name: string, values: IRow[]): Promise<IResult>

  public async insertInto(...args: any[]): Promise<IResult> {
    this.checkClosed()
    let database = this.databaseKey, name: string, values: IRow[]
    if (typeof args[1] === 'string') {
      database = args[0]
      name = args[1]
      values = args[2]
    }
    else {
      name = args[0]
      values = args[1]
    }
    if (!database) throw new NoDatabaseSelectedError()
    const result = await this.core.engine.insertInto(database, name, values)
    this.logger.info(`INSERT INTO \`${name}\` VALUES ${values.length > 10 ? `(${values.length} records)` : values.map(row => JSON.stringify(row)).join(', ')} - ${this.timestamp(result)}`)
    return result
  }

  public async cancel(id: any): Promise<void> {
    this.checkClosed()
    await this.core.engine.cancel(id)
  }

  /**
   * Close this Connection
   */
  public close(): void {
    this.checkClosed()
    this.core.closeConnection(this.id)
    this.closed = true
  }

  private checkClosed(): void {
    if (this.isClosed) throw new AlreadyClosedError(`Connection #${this.id} already closed`)
  }

  private timestamp(result: IResult): string {
    return `time: ${result.time === 0 ? '< 1' : result.time}ms`
  }
}
