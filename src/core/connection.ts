import { DatabaseCore } from '.'
import { Transaction } from '../engine/core/transaction'
import { Column } from '../schema/column'
import { AlreadyClosedError } from '../utils/error/AlreadyClosedError'
import { NoDatabaseSelectedError } from '../utils/error/NoDatabaseSelectedError'
import { Logger } from '../utils/logger'
import { IResult, IRow } from './interfaces'

/**
 * For each Connection
 */
export class Connection {
  public static count = 0

  public readonly id = ++Connection.count
  public databaseKey?: string
  public closed: boolean = false

  protected readonly logger: Logger = new Logger(`[Connection#${this.id}]`)

  constructor(protected readonly core: DatabaseCore) {
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
   * Set default Database
   * @param name [string]
   */
  public useDatabase(name: string): Promise<IResult> {
    this.checkClosed()
    const base = Date.now()
    return Promise.resolve(this.core.engine.getDatabase(name))
      .then(database => this.databaseKey = database.key)
      .then(() => {
        const time = Date.now() - base
        this.logger.info(`USE \`${name}\` - ${this.timestamp({ time })}`)
        return time
      })
      .then(time => ({ time }))
  }

  /**
   * Create a clean Database
   * @param name [string]
   * @param ifNotExists [boolean] Suppress error if the Database with the same name exists
   */
  public createDatabase(name: string, ifNotExists?: true): Promise<IResult> {
    this.checkClosed()
    return this.core.engine.createDatabase(name, ifNotExists)
      .then(result => {
        this.logger.info(`CREATE DATABASE${ifNotExists ? ' IF NOT EXISTS' : ''} \`${name}\` - ${this.timestamp(result)}`)
        return result
      })
  }

  /**
   * Rename the Database
   * @param name [string]
   * @param newName [string]
   */
  public renameDatabase(name: string, newName: string): Promise<IResult> {
    this.checkClosed()
    return this.core.engine.renameDatabase(name, newName)
      .then(result => {
        this.logger.info(`RENAME DATABASE \`${name}\` TO \`${newName}\` - ${this.timestamp(result)}`)
        return result
      })
  }

  /**
   * Drop the Database
   * @param name [string]
   * @param ifExists [boolean] Suppress error if the Database does not exists
   */
  public dropDatabase(name: string, ifExists?: true): Promise<IResult> {
    this.checkClosed()
    return this.core.engine.dropDatabase(name, ifExists)
      .then(result => {
        this.logger.info(`DROP DATABASE${ifExists ? ' IF EXISTS' : ''} \`${name}\` - ${this.timestamp(result)}`)
        return result
      })
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

  public createTable(...args: any[]): Promise<IResult> {
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
    return this.core.engine.createTable(databaseName, name, columns, ifNotExists)
      .then(result => {
        this.logger.info(`CREATE TABLE${ifNotExists ? ' IF NOT EXISTS' : ''} \`${name}\`(${columns.map(column => column.sql).join(', ')}) - ${this.timestamp(result)}`)
        return result
      })
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

  public renameTable(...args: any[]): Promise<IResult> {
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
    return this.core.engine.renameTable(database, name, newName)
      .then(result => {
        this.logger.info(`RENAME TABLE \`${name}\` TO \`${newName}\` - ${this.timestamp(result)}`)
        return result
      })
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

  public dropTable(...args: any[]): Promise<IResult> {
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
    return this.core.engine.dropTable(database, name, ifExists)
      .then(result => {
        this.logger.info(`DROP TABLE${ifExists ? ' IF EXISTS' : ''} \`${name}\` - ${this.timestamp(result)}`)
        return result
      })
  }

  /**
   * Insert data into a Table
   * @param name [string]
   * @param values [Array<IRow>]
   */
  public insertInto(name: string, values: IRow[]): Promise<IResult>

  /**
   * Insert data into a Table
   * @param databaseNameOrKey [string]
   * @param name [string]
   * @param values [Array<IRow>]
   */
  public insertInto(databaseName: string, name: string, values: IRow[]): Promise<IResult>

  public insertInto(...args: any[]): Promise<IResult> {
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
    return this.core.engine.insertInto(database, name, values)
      .then(result => {
        this.logger.info(`INSERT INTO \`${name}\` VALUES ${values.map(row => JSON.stringify(row)).join(', ')} - ${this.timestamp(result)}`)
        return result
      })
  }

  /**
   * Start a Transaction
   */
  public startTransaction(): Transaction {
    this.checkClosed()
    const transaction = this.core.engine.startTransaction(this, this.core)
    this.logger.info(`BEGIN TRANSACTION #${transaction.id}`)
    return transaction
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
