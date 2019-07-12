import { CancelablePromise, CancelError } from '@kennysng/c-promise'
import { CreateDatabaseJQL, CreateFunctionJQL, CreateTableJQL, DropDatabaseJQL, DropFunctionJQL, DropTableJQL, IJQL, InsertJQL, IQuery, isParseable, JQLError, parse, PredictJQL, Query } from 'node-jql'
import uuid = require('uuid/v4')
import { ApplicationCore } from '.'
import { InMemoryDatabaseEngine } from '../memoryEngine'
import { ClosedError } from '../utils/error/ClosedError'
import { NoDatabaseError } from '../utils/error/NoDatabaseError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { SessionError } from '../utils/error/SessionError'
import { TEMP_DB_NAME } from './constants'
import { AnalyzedPredictJQL, AnalyzedQuery, PreparedQuery } from './query'
import { IPredictResult, IQueryResult, IUpdateResult, Resultset } from './result'
import { StatusCode, Task } from './task'

/**
 * Client session
 */
export class Session {
  public readonly id = uuid()
  public database?: string
  public tasks: Task[] = []
  public tempTables: Array<[string, string]> = []
  public closed: boolean = false

  /**
   * @param core [ApplicationCore]
   */
  constructor(private readonly core: ApplicationCore) {
  }

  // @override
  get [Symbol.toStringTag](): string {
    return Session.name
  }

  /**
   * Check if the session is closed
   */
  get isClosed(): boolean {
    return this.closed
  }

  /**
   * Get the id of the last running task
   */
  get lastTaskId(): string {
    return this.tasks[this.tasks.length - 1].id
  }

  /**
   * Assign default database
   * @param database [string] database name
   */
  public use(database: string): void {
    this.checkClosed()
    if (!this.core.getDatabase(database)) throw new NotFoundError(`Database ${database} not found`)
    this.database = database
  }

  /**
   * Execute an UPDATE JQL
   * @param jql [IJQL]
   */
  public async update(jql: IJQL): Promise<IUpdateResult> {
    const startTime = Date.now()
    if (isParseable(jql)) jql = parse(jql)
    if (isParseable(jql)) {
      let result: IUpdateResult
      switch (jql.classname) {
        case CreateDatabaseJQL.name:
          result = await this.createDatabase(jql as CreateDatabaseJQL)
          break
        case DropDatabaseJQL.name:
          result = await this.dropDatabase(jql as DropDatabaseJQL)
          break
        case CreateTableJQL.name: {
          const jql_ = jql as CreateTableJQL
          jql_.database = jql_.database || this.database
          result = await this.executeTableJQL(jql_)
          break
        }
        case DropTableJQL.name: {
          const jql_ = jql as CreateTableJQL
          jql_.database = jql_.database || this.database
          result = await this.executeTableJQL(jql_)
          break
        }
        case InsertJQL.name: {
          const jql_ = jql as CreateTableJQL
          jql_.database = jql_.database || this.database
          result = await this.executeTableJQL(jql_)
          break
        }
        case CreateFunctionJQL.name:
          result = await this.createFunction(jql as CreateFunctionJQL)
          break
        case DropFunctionJQL.name:
          result = await this.dropFunction(jql as DropFunctionJQL)
          break
        default:
          throw new JQLError(`Invalid JQL ${jql.classname}`)
      }
      return {
        ...result,
        jql,
        time: Date.now() - startTime,
      }
    }
    throw new JQLError(`Invalid JQL: ${JSON.stringify(jql)}`)
  }

  /**
   * Predict the result structure of a SELECT JQL
   * @param jql [PredictJQL]
   */
  public async predict(jql: PredictJQL): Promise<IPredictResult> {
    const startTime = Date.now()
    const analyzed = new AnalyzedPredictJQL(jql, this.database)

    // check database engine
    for (const name of analyzed.databases) {
      const database = this.core.getDatabase(name)
      if (!database) throw new NotFoundError(`Database ${name} not found`)
      if (!(database.engine instanceof InMemoryDatabaseEngine)) throw new SyntaxError(`Database ${name} does not support PREDICT`)
    }

    let result: IPredictResult
    if (analyzed.multiDatabasesInvolved) {
      result = await this.predictWithMultiDatabases(analyzed)
    }
    else {
      if (analyzed.noDatabaseInvolved) analyzed.databases.push(TEMP_DB_NAME)
      result = await this.predictWithSingleDatabase(analyzed)
    }

    return {
      ...result,
      jql,
      time: Date.now() - startTime,
    }
  }

  /**
   * Execute a SELECT JQL
   * @param jql [IQuery]
   */
  public async query(jql: IQuery): Promise<IQueryResult> {
    const startTime = Date.now()
    jql = jql instanceof PreparedQuery ? jql.commit() : new Query(jql)
    const analyzed = new AnalyzedQuery(jql, this.database)
    let result: IQueryResult
    if (analyzed.multiDatabasesInvolved) {
      result = await this.queryWithMultiDatabases(analyzed)
    }
    else {
      if (analyzed.noDatabaseInvolved) analyzed.databases.push(TEMP_DB_NAME)
      result = await this.queryWithSingleDatabase(analyzed)
    }
    return {
      ...result,
      jql,
      time: Date.now() - startTime,
    }
  }

  /**
   * Kill running task
   * @param taskId [string] task ID
   */
  public kill(taskId: string): void {
    const index = this.tasks.findIndex(({ id }) => id === taskId)
    if (index === -1) throw new NotFoundError('Query not found')
    this.tasks[index].promise.cancel()
  }

  /**
   * Close the session. Throw error if there are running queries
   * @param force [boolean] whether to force close the session, i.e. kill the running queries
   */
  public close(force?: boolean): void {
    this.checkClosed()
    if (force) for (const { id } of this.tasks) this.kill(id)
    else if (this.tasks.length) throw new SessionError('Session is not idle')
    this.closed = true

    // drop temporary tables created in this session
    for (const [database, name] of this.tempTables) this.update(new DropTableJQL({ $temporary: true, database, name }))
  }

  private checkClosed(): void {
    if (this.closed) throw new ClosedError('Session already closed')
  }

  private register(task: Task): void {
    this.tasks.push(task)
    const removeTask = () => {
      const index = this.tasks.indexOf(task)
      if (index > -1) this.tasks.splice(index, 1)
    }
    task.on('completed', removeTask)
    task.promise.on('canceled', removeTask)
  }

  private async createDatabase(jql: CreateDatabaseJQL): Promise<IUpdateResult> {
    const task = this.core.createDatabase(jql)
    this.register(task)
    return await task.promise
  }

  private async dropDatabase(jql: DropDatabaseJQL): Promise<IUpdateResult> {
    const task = this.core.dropDatabase(jql)
    this.register(task)
    return await task.promise
  }

  private async createFunction(jql: CreateFunctionJQL): Promise<IUpdateResult> {
    const task = this.core.createFunction(jql)
    this.register(task)
    return await task.promise
  }

  private async dropFunction(jql: DropFunctionJQL): Promise<IUpdateResult> {
    const task = this.core.dropFunction(jql)
    this.register(task)
    return await task.promise
  }

  private async executeTableJQL(jql: CreateTableJQL|DropTableJQL|InsertJQL): Promise<IUpdateResult> {
    const task = new Task<IUpdateResult>(jql, task => {
      // preparing
      task.status(StatusCode.PREPARING)
      const name = jql.database as string
      if (!name) throw new NoDatabaseError()
      const database = this.core.getDatabase(name)
      if (!database) throw new NotFoundError(`Database ${name} not found`)

      let taskId: string|undefined
      const promise = new CancelablePromise(
        () => database.executeUpdate(jql)(task),
        async (fn, resolve, reject, check, canceled) => {
          try {
            // INSERT INTO SELECT
            if (jql instanceof InsertJQL && jql.query) {
              const queryPromise = this.query(jql.query)
              taskId = this.lastTaskId
              const { rows, columns } = await queryPromise
              taskId = undefined

              if (!columns || columns.length !== (jql.columns as string[]).length) {
                throw new SyntaxError(`Columns unmatched: ${jql.toString()}`)
              }

              const columns_ = jql.columns as string[]
              const result = jql.values = [] as any[]
              for (let i = 0, length = rows.length; i < length; i += 1) {
                const row = rows[i]
                result.push(columns.reduce((row_, { id }, i) => {
                  row_[columns_[i]] = row[id]
                  return row_
                }, {} as any))
              }
            }

            // run JQL
            let result = await fn()

            // record temporary table
            if ('$temporary' in jql && jql.$temporary) {
              if (jql instanceof CreateTableJQL) {
                this.tempTables.push([name, jql.name])
              }
              else {
                const index = this.tempTables.findIndex(tempTable => tempTable[0] === name && tempTable[1] === jql.name)
                if (index > -1) this.tempTables.splice(index, 1)
              }
            }

            // CREATE TABLE AS
            if (jql instanceof CreateTableJQL && jql.$as) {
              const queryPromise = this.query(jql.$as)
              taskId = this.lastTaskId
              const values = new Resultset(await queryPromise).toArray()
              taskId = undefined

              const insertPromise = this.update(new InsertJQL(jql.name, ...values))
              taskId = this.lastTaskId
              result = await insertPromise
              taskId = undefined

              // fix result
              result.count += 1
              result.jql = jql
            }

            // return
            task.status(StatusCode.COMPLETED)
            return resolve(result)
          }
          catch (e) {
            if (e instanceof CancelError) canceled()
            return reject(e)
          }
        },
      )
      promise.on('cancel', () => { if (taskId) this.kill(taskId) })
      return promise
    })
    this.register(task)
    return await task.promise
  }

  private async predictWithSingleDatabase(jql: AnalyzedPredictJQL): Promise<IPredictResult> {
    const task = new Task<IPredictResult>(jql, task => {
      // preparing
      task.status(StatusCode.PREPARING)
      const name: string = jql.databases[0]
      if (!name) throw new NoDatabaseError()
      const database = this.core.getDatabase(name)
      if (!database) throw new NotFoundError(`Database ${name} not found`)

      return new CancelablePromise(
        () => database.predictQuery(jql)(task),
        async (fn, resolve, reject, _check, canceled) => {
          try {
            // run JQL
            const result = await fn()

            // return
            task.status(StatusCode.COMPLETED)
            return resolve(result)
          }
          catch (e) {
            if (e instanceof CancelError) canceled()
            return reject(e)
          }
        },
      )
    })
    this.register(task)
    return await task.promise
  }

  private async predictWithMultiDatabases(jql: AnalyzedPredictJQL): Promise<IPredictResult> {
    // TODO prepare tables
    // TODO run in temp db
    return { columns: [], time: 0 }
  }

  private async queryWithSingleDatabase(jql: AnalyzedQuery): Promise<IQueryResult> {
    const task = new Task<IQueryResult>(jql, task => {
      // preparing
      task.status(StatusCode.PREPARING)
      const name: string = jql.databases[0]
      if (!name) throw new NoDatabaseError()
      const database = this.core.getDatabase(name)
      if (!database) throw new NotFoundError(`Database ${name} not found`)

      return new CancelablePromise(
        () => database.executeQuery(jql)(task),
        async (fn, resolve, reject, _check, canceled) => {
          try {
            // run JQL
            const result = await fn()

            // return
            task.status(StatusCode.COMPLETED)
            return resolve(result)
          }
          catch (e) {
            if (e instanceof CancelError) canceled()
            return reject(e)
          }
        },
      )
    })
    this.register(task)
    return await task.promise
  }

  private async queryWithMultiDatabases(jql: AnalyzedQuery): Promise<IQueryResult> {
    // TODO prepare tables
    // TODO run in temp db
    return { rows: [], columns: [], time: 0 }
  }
}
