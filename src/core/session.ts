import { CancelablePromise, CancelError } from '@kennysng/c-promise'
import { CreateDatabaseJQL, CreateFunctionJQL, CreateTableJQL, DropDatabaseJQL, DropFunctionJQL, DropTableJQL, IJQL, InsertJQL, IQuery, isParseable, JQLError, parseJQL, PredictJQL, Query } from 'node-jql'
import uuid = require('uuid/v4')
import { ApplicationCore } from '.'
import { ClosedError } from '../utils/error/ClosedError'
import { NoDatabaseError } from '../utils/error/NoDatabaseError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { SessionError } from '../utils/error/SessionError'
import { databaseName } from './constants'
import { IPredictResult, IQueryResult, IUpdateResult } from './interface'
import { AnalyzedPredictJQL, AnalyzedQuery, PreparedQuery } from './query'
import { Resultset } from './result'
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
    if (!this.core.getDatabase(database)) throw new NotFoundError(`Database ${databaseName(database)} not found`)
    this.database = database
  }

  /**
   * Execute an UPDATE JQL
   * @param jql [IJQL]
   */
  public async update(jql: IJQL): Promise<IUpdateResult> {
    const startTime = Date.now()
    if (isParseable(jql)) jql = parseJQL(jql)
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
          result = await this.createTable(jql_)
          break
        }
        case DropTableJQL.name: {
          const jql_ = jql as CreateTableJQL
          jql_.database = jql_.database || this.database
          result = await this.executeTableJQL(jql_)
          break
        }
        case InsertJQL.name: {
          const jql_ = jql as InsertJQL
          jql_.database = jql_.database || this.database
          result = await this.insertTable(jql_)
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
      if (!database) throw new NotFoundError(`Database ${databaseName(name)} not found`)
      if (!database.engine.isPredictSupported) throw new SyntaxError(`Database ${databaseName(name)} does not support PREDICT`)
    }
    const result = analyzed.multiEnginesInvolved(this.core) ? await this.predictWithMultiDatabases(analyzed) : await this.predictWithSingleDatabase(analyzed)
    return { ...result, jql, time: Date.now() - startTime }
  }

  /**
   * Execute a SELECT JQL
   * @param jql [IQuery]
   */
  public async query(jql: IQuery): Promise<IQueryResult> {
    const startTime = Date.now()
    jql = jql instanceof PreparedQuery ? jql.commit() : new Query(jql)
    const analyzed = new AnalyzedQuery(jql, this.database)
    const result = analyzed.multiEnginesInvolved(this.core) ? await this.queryWithMultiDatabases(analyzed) : await this.queryWithSingleDatabase(analyzed)
    return { ...result, jql, time: Date.now() - startTime }
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
    return task.promise
  }

  private async dropDatabase(jql: DropDatabaseJQL): Promise<IUpdateResult> {
    const task = this.core.dropDatabase(jql)
    this.register(task)
    return task.promise
  }

  private async createFunction(jql: CreateFunctionJQL): Promise<IUpdateResult> {
    const task = this.core.createFunction(jql)
    this.register(task)
    return task.promise
  }

  private async dropFunction(jql: DropFunctionJQL): Promise<IUpdateResult> {
    const task = this.core.dropFunction(jql)
    this.register(task)
    return task.promise
  }

  private async executeTableJQL(jql: CreateTableJQL|DropTableJQL|InsertJQL): Promise<IUpdateResult> {
    const task = new Task<IUpdateResult>(jql, task => {
      // preparing
      task.status(StatusCode.PREPARING)
      const name = jql.database as string
      if (!name) throw new NoDatabaseError()
      const database = this.core.getDatabase(name)
      if (!database) throw new NotFoundError(`Database ${databaseName(name)} not found`)
      return new CancelablePromise(
        () => database.executeUpdate(jql)(task),
        async (fn, resolve, reject, _check, canceled) => {
          try {
            // run JQL
            const result = await fn()

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
    return task.promise
  }

  private async createTable(jql: CreateTableJQL): Promise<IUpdateResult> {
    if (!jql.$as) return this.executeTableJQL(jql)

    // check multiple engines involved
    const analyzed = jql.$as = new AnalyzedQuery(jql.$as, this.database)
    const name = jql.database || this.database
    if (!name) throw new NoDatabaseError()
    const database = this.core.getDatabase(name)
    if (!database) throw new NotFoundError(`Database ${databaseName(name)} not found`)
    const multiEnginesInvolved = analyzed.databases.reduce((result, name) => {
      if (result) return result
      const database_ = this.core.getDatabase(name)
      if (!database_) throw new NotFoundError(`Database ${databaseName(name)} not found`)
      return database.engine !== database_.engine
    }, false)

    if (!multiEnginesInvolved) return this.executeTableJQL(jql)

    let taskId: string|undefined
    const task = new Task(jql, task => {
      const promise = new CancelablePromise<IUpdateResult>(async (resolve, _reject, check) => {
        // run query first
        task.status(StatusCode.PREPARING)
        const queryPromise = this.query(analyzed)
        taskId = this.lastTaskId
        const queryResult = await queryPromise
        check()
        const values = new Resultset(queryResult).toArray()
        taskId = undefined

        // creat table
        task.status(StatusCode.RUNNING)
        const createPromise = this.update({ ...jql, columns: queryResult.columns, $as: undefined })
        taskId = this.lastTaskId
        const createResult = await createPromise
        check()

        // insert into table
        if (createResult.count === 1) {
          const insertPromise = this.update(new InsertJQL(jql.name, ...values))
          taskId = this.lastTaskId
          const result = await insertPromise
          taskId = undefined

          task.status(StatusCode.COMPLETED)
          return resolve({ count: result.count + 1, jql, time: 0 })
        }
        else {
          task.status(StatusCode.COMPLETED)
          return resolve({ count: 0, jql, time: 0 })
        }
      })
      promise.on('cancel', () => { if (taskId) this.kill(taskId) })
      return promise
    })
    this.register(task)
    return task.promise
  }

  private async insertTable(jql: InsertJQL): Promise<IUpdateResult> {
    if (!jql.query) return this.executeTableJQL(jql)

    // check multiple engines involved
    const analyzed = jql.query = new AnalyzedQuery(jql.query, this.database)
    const name = jql.database || this.database
    if (!name) throw new NoDatabaseError()
    const database = this.core.getDatabase(name)
    if (!database) throw new NotFoundError(`Database ${databaseName(name)} not found`)
    const multiEnginesInvolved = analyzed.databases.reduce((result, name) => {
      if (result) return result
      const database_ = this.core.getDatabase(name)
      if (!database_) throw new NotFoundError(`Database ${databaseName(name)} not found`)
      return database.engine !== database_.engine
    }, false)

    if (!multiEnginesInvolved) return this.executeTableJQL(jql)

    let taskId: string|undefined
    const task = new Task(jql, task => {
      const promise = new CancelablePromise<IUpdateResult>(async (resolve, _reject, check) => {
        // run query first
        task.status(StatusCode.PREPARING)
        const queryPromise = this.query(analyzed)
        taskId = this.lastTaskId
        const { rows, columns } = await queryPromise
        check()
        taskId = undefined

        // post process
        if (!columns || columns.length !== (jql.columns as string[]).length) {
          throw new SyntaxError(`Columns unmatched: ${jql.toString()}`)
        }

        const columns_ = jql.columns as string[]
        const values = [] as any[]
        for (let i = 0, length = rows.length; i < length; i += 1) {
          const row = rows[i]
          values.push(columns.reduce((row_, { id }, i) => {
            row_[columns_[i]] = row[id]
            return row_
          }, {} as any))
        }

        // insert into table
        if (rows.length > 0) {
          task.status(StatusCode.RUNNING)
          const insertPromise = this.update(new InsertJQL(jql.name, ...values))
          taskId = this.lastTaskId
          const result = await insertPromise
          taskId = undefined

          task.status(StatusCode.COMPLETED)
          return resolve({ count: result.count + 1, jql, time: 0 })
        }
        else {
          task.status(StatusCode.COMPLETED)
          return resolve({ count: 0, jql, time: 0 })
        }
      })
      promise.on('cancel', () => { if (taskId) this.kill(taskId) })
      return promise
    })
    this.register(task)
    return task.promise
  }

  private async predictWithSingleDatabase(jql: AnalyzedPredictJQL): Promise<IPredictResult> {
    const task = new Task<IPredictResult>(jql, task => {
      // preparing
      task.status(StatusCode.PREPARING)
      const name: string = jql.databases[0]
      if (!name) throw new NoDatabaseError()
      const database = this.core.getDatabase(name)
      if (!database) throw new NotFoundError(`Database ${databaseName(name)} not found`)

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
    return task.promise
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
      if (!database) throw new NotFoundError(`Database ${databaseName(name)} not found`)

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
    return task.promise
  }

  private async queryWithMultiDatabases(jql: AnalyzedQuery): Promise<IQueryResult> {
    // TODO prepare tables
    // TODO run in temp db
    return { rows: [], columns: [], time: 0 }
  }
}
