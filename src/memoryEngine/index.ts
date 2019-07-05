import { CancelablePromise } from '@kennysng/c-promise'
import { AxiosInstance } from 'axios'
import { checkNull, CreateTableJQL, DropTableJQL, InsertJQL, isParseable, JQL, normalize } from 'node-jql'
import { DatabaseEngine } from '../core/engine'
import { AnalyzedQuery } from '../core/query'
import { IQueryResult, IUpdateResult } from '../core/result'
import { StatusCode, TaskFn } from '../core/task'
import { ExistsError } from '../utils/error/ExistsError'
import { InMemoryError } from '../utils/error/InMemoryError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { NotInitedError } from '../utils/error/NotInitedError'
import { ILogger } from '../utils/logger'
import { functions } from './function/functions'
import { CompiledQuery } from './query'
import { Sandbox } from './sandbox'
import { Table } from './table'

/**
 * In-memory database engine options
 */
export interface IInMemoryOptions {
  /**
   * Default axios instance
   */
  axiosInstance?: AxiosInstance

  /**
   * Custom logging
   */
  logger?: ILogger
}

/**
 * Save data in volatile memory i.e. RAM
 */
export class InMemoryDatabaseEngine extends DatabaseEngine {
  /**
   * JQL functions
   */
  public readonly functions = functions

  private readonly context: { [key: string]: { __tables: Table[], [key: string]: any[] } } = {}

  constructor(private readonly options: IInMemoryOptions = {}) {
    super()
  }

  // @override
  public async init(): Promise<void> {
    if (!this.initing && !this.inited) {
      this.initing = true
      if (this.options.logger) this.options.logger.info(`Initialized`)
      this.inited = true
      this.initing = false
    }
  }

  // @override
  public async retrieveRowsFor(database: string, table: string): Promise<any[]> {
    this.checkInited()
    this.checkTable(database, table)
    return this.context[database][table]
  }

  // @override
  public async getCountOf(database: string, table: string): Promise<number> {
    this.checkInited()
    this.checkTable(database, table)
    return this.context[database][table].length
  }

  /**
   * Find table
   * @param database [string]
   * @param name [string]
   */
  public getTable(database: string, name: string): Table {
    this.checkTable(database, name)
    const table = this.context[database].__tables.find(table => table.name === name)
    if (!table) throw new InMemoryError(`[FATAL] Table ${name} expected to be found in database ${database}`)
    return table
  }

  // @override
  public createDatabase(name: string): TaskFn<IUpdateResult> {
    this.checkInited()
    return task => new CancelablePromise(resolve => {
      // create database
      task.status(StatusCode.RUNNING)
      let count = 0
      if (checkNull(this.context[name])) {
        this.context[name] = { __tables: [] }
        if (this.options.logger) this.options.logger.info(`Database ${name} created`)
        count = 1
      }

      // return
      task.status(StatusCode.ENDING)
      return resolve({ count, time: 0 })
    })
  }

  // @override
  public dropDatabase(name: string): TaskFn<IUpdateResult> {
    this.checkInited()
    return task => new CancelablePromise(resolve => {
      // drop database
      task.status(StatusCode.RUNNING)
      let count = 0
      if (this.context[name]) {
        delete this.context[name]
        if (this.options.logger) this.options.logger.info(`Database ${name} dropped`)
        count = 1
      }

      // return
      task.status(StatusCode.ENDING)
      return resolve({ count, time: 0 })
    })
  }

  // @override
  public executeUpdate(jql: JQL): TaskFn<IUpdateResult> {
    this.checkInited()
    if (isParseable(jql)) {
      switch (jql.classname) {
        case CreateTableJQL.name:
          return this.createTable(jql as CreateTableJQL)
        case DropTableJQL.name:
          return this.dropTable(jql as DropTableJQL)
        case InsertJQL.name:
          return this.insert(jql as InsertJQL)
        default:
          throw new InMemoryError(`Invalid JQL ${jql.classname}`)
      }
    }
    throw new InMemoryError(`Invalid JQL: ${JSON.stringify(jql)}`)
  }

  // @override
  public executeQuery(jql: AnalyzedQuery): TaskFn<IQueryResult> {
    this.checkInited()
    const compiled = new CompiledQuery(this, jql, { axiosInstance: this.options.axiosInstance, defDatabase: jql.defDatabase })
    return task => new CancelablePromise(
      new Sandbox(this, jql.defDatabase).run(compiled),
      async (promise, resolve, reject, check) => {
        // check canceled
        check()

        // wait for table lock
        task.status(StatusCode.WAITING)
        for (const name of compiled.options.tablesOrder) {
          const table = compiled.options.tables[name]
          await table.lock.read()
        }

        try {
          // check canceled
          check()

          // run query
          task.status(StatusCode.RUNNING)
          const result = await promise

          // return
          task.status(StatusCode.ENDING)
          return resolve(result)
        }
        finally {
          // release table lock
          for (const name of compiled.options.tablesOrder) {
            const table = compiled.options.tables[name]
            table.lock.readEnd()
          }
        }
      },
    )
  }

  private checkInited(): void {
    if (!this.inited) throw new NotInitedError(InMemoryDatabaseEngine)
  }

  private checkDatabase(database: string): void {
    if (checkNull(this.context[database])) throw new NotFoundError(`Database ${database} not found`)
  }

  private checkTable(database: string, table: string): void {
    this.checkDatabase(database)
    if (!this.context[database].__tables.find(({ name }) => name === table)) throw new NotFoundError(`Table ${table} not found in database ${database}`)
  }

  private createTable(jql: CreateTableJQL): TaskFn<IUpdateResult> {
    // parse args
    const { $temporary, database, name, $ifNotExists, columns, constraints, options } = jql

    // check args
    if (!database) throw new InMemoryError('No database is selected')
    if (name === '__tables') throw new InMemoryError('Reserved keyword __tables')

    return task => new CancelablePromise((resolve, reject, check) => {
      task.status(StatusCode.RUNNING)
      let count = 0
      try {
        // check table
        this.checkTable(database, name)
        if (!$ifNotExists) throw new ExistsError(`Table ${name} already exists in database ${database}`)
      }
      catch (e) {
        if (e instanceof NotFoundError) {
          // check canceled
          check()

          // create table
          const table = new Table($temporary, name, columns, constraints, ...(options || []))
          this.context[database].__tables.push(table)
          this.context[database][name] = []

          // return
          if (this.options.logger) this.options.logger.info(`Table ${name} created in database ${database}`)
          count = 1
        }
        else {
          return reject(e)
        }
      }

      // end task
      task.status(StatusCode.ENDING)
      return resolve({ count, time: 0 })
    })
  }

  private dropTable(jql: DropTableJQL): TaskFn<IUpdateResult> {
    // parse args
    const { database, name, $ifExists } = jql

    // check args
    if (!database) throw new InMemoryError('No database is selected')

    return task => new CancelablePromise((resolve, reject, check) => {
      task.status(StatusCode.RUNNING)
      let count = 0
      try {
        // check table
        this.checkTable(database, name)

        // check canceled
        check()

        // delete table
        const index = this.context[database].__tables.findIndex(table => table.name === name)
        if (index === -1) throw new InMemoryError(`[FATAL] Table ${name} expected to be found in database ${database}`)
        this.context[database].__tables.splice(index, 1)
        delete this.context[database][name]

        // return
        if (this.options.logger) this.options.logger.info(`Table ${name} dropped from database ${database}`)
        count = 1
      }
      catch (e) {
        if (!(e instanceof NotFoundError) || !$ifExists) return reject(e)
      }

      // end task
      task.status(StatusCode.ENDING)
      return resolve({ count, time: 0 })
    })
  }

  private insert(jql: InsertJQL): TaskFn<IUpdateResult> {
    // parse args
    const { database, name, values } = jql

    // check args
    if (!database) throw new InMemoryError('No database is selected')

    return task => new CancelablePromise(async (resolve, reject, check) => {
      task.status(StatusCode.RUNNING)

      try {
        // check table
        this.checkTable(database, name)
        const table = this.context[database].__tables.find(table => table.name === name)
        if (!table) throw new InMemoryError(`[FATAL] Table ${name} expected to be found in database ${database}`)

        // check canceled
        check()

        // acquire table lock
        task.status(StatusCode.WAITING)
        await table.lock.write()

        try {
          task.status(StatusCode.RUNNING)

          const nValues = [] as any[]
          for (const row of values) {
            const nRow = {} as any
            for (const column of table.columns) {
              // validate value
              const value = column.checkValue(row[column.name])

              // normalize value
              nRow[column.name] = normalize(value, column.type)
            }
            nValues.push(nRow)
          }

          // insert values
          const context = this.context[database][name] = this.context[database][name] || []
          context.push(...nValues)

          // return
          if (this.options.logger) this.options.logger.info(`Inserted ${nValues.length} rows into table ${name} in database ${database}`)
          return resolve({ count: nValues.length, time: 0 })
        }
        finally {
          // release table lock
          table.lock.writeEnd()
        }
      }
      catch (e) {
        return reject(e)
      }
    })
  }
}
