import { CancelablePromise, CancelError } from '@kennysng/c-promise'
import { CreateDatabaseJQL, CreateFunctionJQL, DropDatabaseJQL, DropFunctionJQL, JQLError } from 'node-jql'
import { InMemoryDatabaseEngine } from '../memoryEngine'
import { GenericJQLFunction } from '../memoryEngine/function'
import { ExistsError } from '../utils/error/ExistsError'
import { InMemoryError } from '../utils/error/InMemoryError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { NotInitedError } from '../utils/error/NotInitedError'
import { SessionError } from '../utils/error/SessionError'
import { databaseName, TEMP_DB_NAME } from './constants'
import { Database } from './database'
import { DatabaseEngine } from './engine'
import { IApplicationOptions, IUpdateResult } from './interface'
import { Session } from './session'
import { StatusCode, Task } from './task'

let DEFAULT_IN_MEMORY_ENGINE: InMemoryDatabaseEngine

/**
 * JavaScript-Database bridge application
 */
export class ApplicationCore {
  private initing = false
  private inited = false
  private readonly sessions: Session[] = []
  private readonly databases: Database[] = []
  private readonly engines: _.Dictionary<DatabaseEngine> = {}

  /**
   * @param options [IApplicationOptions]
   */
  constructor(public readonly options: IApplicationOptions = {}) {
    DEFAULT_IN_MEMORY_ENGINE = options.defaultInMemoryEngine || new InMemoryDatabaseEngine()
    const defaultEngine = options.defaultEngine || DEFAULT_IN_MEMORY_ENGINE
    this.register('DEFAULT_ENGINE', defaultEngine)
    this.register('InMemoryEngine', defaultEngine instanceof InMemoryDatabaseEngine ? defaultEngine : DEFAULT_IN_MEMORY_ENGINE)
  }

  /**
   * Initialize the application
   */
  public async init(): Promise<void> {
    // initialize registered database engines
    const promises = Object.keys(this.engines).map(name => this.engines[name].init())
    await Promise.all(promises)

    if (!this.initing && !this.inited) {
      this.initing = true

      // create in-memory temporary database
      await this.createDatabase(new CreateDatabaseJQL(TEMP_DB_NAME, true, 'InMemoryEngine')).promise

      this.inited = true
      this.initing = false
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return ApplicationCore.name
  }

  /**
   * Register database engine
   * @param name [string]
   * @param engine [DatabaseEngine]
   */
  public async register(name: string, engine: DatabaseEngine): Promise<ApplicationCore> {
    this.engines[name] = engine
    if (this.inited) await engine.init()
    return this
  }

  /**
   * Create a session instance
   * @param database [string] default database
   */
  public createSession(database?: string): Session {
    this.checkInited()
    const session = new Session(this)
    this.sessions.push(session)
    if (database) session.use(database)
    return session
  }

  /**
   * Get the session instance
   * @param uuid [string] session ID
   */
  public getSession(uuid: string): Session {
    this.checkInited()
    const session = this.sessions.find(({ id }) => id === uuid)
    if (!session) throw new SessionError('Session not found')
    return session
  }

  /**
   * Close a session
   * @param uuid [string] session ID
   */
  public closeSession(uuid: string, force?: boolean): void {
    this.checkInited()
    const index = this.sessions.findIndex(({ id }) => id === uuid)
    if (index === -1) throw new SessionError('Session not found')
    const session = this.sessions[index]
    this.sessions.splice(index, 1)
    session.close(force)
  }

  /**
   * Create a database
   * @param jql [CreateDatabaseJQL]
   */
  public createDatabase(jql: CreateDatabaseJQL): Task<IUpdateResult> {
    // parse args
    const name = jql.name
    const engine = jql.engine ? this.engines[jql.engine] : this.engines['DEFAULT_ENGINE']
    const ifNotExists = jql.$ifNotExists || false

    // check args
    if (!engine) throw new JQLError(`Database engine ${jql.engine} not found`)

    // create task
    return new Task(jql, task => {
      // preparing
      task.status(StatusCode.PREPARING)
      const database = this.getDatabase(name)
      if (database && !ifNotExists) throw new ExistsError(`Database ${databaseName(name)} already exists`)

      // database created
      if (database) {
        return new CancelablePromise(async (resolve, reject, check, canceled) => {
          try {
            await check()

            // return
            task.status(StatusCode.COMPLETED)
            return resolve({ count: 0, jql, time: 0 })
          }
          catch (e) {
            if (e instanceof CancelError) canceled()
            return reject(e)
          }
        })
      }

      // database not created
      const database_ = new Database(name, engine)
      return new CancelablePromise(
        () => database_.create()(task),
        async (fn, resolve, reject, check, canceled) => {
          try {
            // check canceled
            await check()

            // create database
            const result = await fn()
            this.databases.push(database_)

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
  }

  /**
   * Define NodeJQL function
   * @param jql [CreateFunctionJQL]
   */
  public createFunction(jql: CreateFunctionJQL): Task<IUpdateResult> {
    // parse args
    const aggregate = jql.aggregate
    const name = jql.name
    const fn = jql.fn
    const parameters = jql.parameters
    const type = jql.type

    // create task
    return new Task(jql, task => {
      // preparing
      task.status(StatusCode.PREPARING)
      const database = this.getDatabase(TEMP_DB_NAME) as Database<InMemoryDatabaseEngine>
      const fn_ = database.engine.functions[name]
      if (!jql.$ifNotExists && fn_) throw new ExistsError(`Function ${name} already exists`)

      // function created
      if (fn_) {
        return new CancelablePromise(async (resolve, reject, check, canceled) => {
          try {
            await check()

            // return
            task.status(StatusCode.COMPLETED)
            return resolve({ count: 0, jql, time: 0 })
          }
          catch (e) {
            if (e instanceof CancelError) canceled()
            return reject(e)
          }
        })
      }

      // function not created
      return new CancelablePromise(async (resolve, reject, check, canceled) => {
        try {
          await check()

          database.engine.functions[name.toLocaleLowerCase()] = () => aggregate
            ? new GenericJQLFunction(true, name.toLocaleUpperCase(), fn, type, parameters)
            : new GenericJQLFunction(name.toLocaleUpperCase(), fn, type, parameters)

          // return
          task.status(StatusCode.COMPLETED)
          return resolve({ count: 1, jql, time: 0 })
        }
        catch (e) {
          if (e instanceof CancelError) canceled()
          return reject(e)
        }
      })
    })
  }

  /**
   * Drop NodeJQL function
   * @param jql [DropFunctionJQL]
   */
  public dropFunction(jql: DropFunctionJQL): Task<IUpdateResult> {
    // parse args
    const name = jql.name.toLocaleLowerCase()
    const $ifExists = jql.$ifExists

    // create task
    return new Task(jql, task => {
      // preparing
      task.status(StatusCode.PREPARING)
      const database = this.getDatabase(TEMP_DB_NAME) as Database<InMemoryDatabaseEngine>
      const fn_ = database.engine.functions[name]
      if (!fn_ && !$ifExists) throw new NotFoundError(`Function ${name.toLocaleUpperCase()} not found`)

      // not user-defined
      const instance = fn_()
      if (!(instance instanceof GenericJQLFunction)) throw new InMemoryError(`Fail to drop built-in function ${name.toLocaleUpperCase()}`)

      // function not exists
      if (!fn_) {
        return new CancelablePromise(async (resolve, reject, check, canceled) => {
          try {
            await check()

            // return
            task.status(StatusCode.COMPLETED)
            return resolve({ count: 0, jql, time: 0 })
          }
          catch (e) {
            if (e instanceof CancelError) canceled()
            return reject(e)
          }
        })
      }

      // function exists
      return new CancelablePromise(async (resolve, reject, check, canceled) => {
        try {
          await check()

          delete database.engine.functions[name]

          // return
          task.status(StatusCode.COMPLETED)
          return resolve({ count: 1, jql, time: 0 })
        }
        catch (e) {
          if (e instanceof CancelError) canceled()
          return reject(e)
        }
      })
    })
  }

  /**
   * Get the database by name
   * @param database [string] database name
   */
  public getDatabase(database: string): Database|undefined {
    return this.databases.find(({ name }) => name === database)
  }

  /**
   * Get the temporary database
   */
  public async getTempDB(): Promise<Database> {
    return this.getDatabase(TEMP_DB_NAME) as Database
  }

  /**
   * Drop a database
   * @param jql [DropDatabaseJQL]
   */
  public dropDatabase(jql: DropDatabaseJQL): Task<IUpdateResult> {
    // parse args
    const database = jql.name
    const ifExists = jql.$ifExists || false

    // create task
    return new Task(jql, task => {
      task.status(StatusCode.PREPARING)
      const index = this.databases.findIndex(({ name }) => name === database)
      if ((index === -1 || this.databases[index].name === TEMP_DB_NAME) && !ifExists) throw new NotFoundError(`Database ${databaseName(database)} not found`)

      // database not exists
      if (index === -1) {
        return new CancelablePromise(async (resolve, reject, check, canceled) => {
          try {
            await check()

            // return
            task.status(StatusCode.COMPLETED)
            return resolve({ count: 0, jql, time: 0 })
          }
          catch (e) {
            if (e instanceof CancelError) canceled()
            return reject(e)
          }
        })
      }

      // database exists
      return new CancelablePromise(
        () => this.databases[index].drop()(task),
        async (fn, resolve, reject, check, canceled) => {
          try {
            // check canceled
            await check()

            // delete database
            const result = await fn()
            this.databases.splice(index, 1)

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
  }

  private checkInited(): void {
    if (!this.inited) throw new NotInitedError(ApplicationCore)
  }
}
