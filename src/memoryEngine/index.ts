import { CancelablePromise } from '@kennysng/c-promise'
import { checkNull, Column, CreateJQL, CreateTableJQL, DropTableJQL, InsertJQL, isParseable, JQL, normalize, PredictJQL, Query } from 'node-jql'
import { databaseName, TEMP_DB_NAME } from '../core/constants'
import { DatabaseEngine } from '../core/engine'
import { IPredictResult, IQueryResult, IUpdateResult } from '../core/interface'
import { AnalyzedQuery } from '../core/query'
import { Resultset } from '../core/result'
import { StatusCode, TaskFn } from '../core/task'
import { ExistsError } from '../utils/error/ExistsError'
import { InMemoryError } from '../utils/error/InMemoryError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { NotInitedError } from '../utils/error/NotInitedError'
import { functions } from './function/functions'
import { ICompileOptions, IInMemoryOptions } from './interface'
import { CompiledQuery } from './query'
import { Sandbox } from './sandbox'
import { MemoryTable } from './table'

/**
 * Save data in volatile memory i.e. RAM
 */
export class InMemoryDatabaseEngine extends DatabaseEngine {
  // @override
  public readonly isPredictSupported = true

  /**
   * JQL functions
   */
  public readonly functions = functions

  protected readonly context: { [key: string]: { __tables: MemoryTable[], [key: string]: any[] } } = {}

  constructor(protected readonly options: IInMemoryOptions = {}) {
    super()
  }

  /**
   * Time gap between each cancel check
   */
  get checkWindowSize(): number {
    return this.options.checkWindowSize || 5000
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
  public retrieveRowsFor(database: string, table: string): CancelablePromise<any[]> {
    this.checkInited()
    return new CancelablePromise(resolve => {
      this.checkTable(database, table)
      return resolve(this.context[database][table])
    })
  }

  // @override
  public getCountOf(database: string, table: string): CancelablePromise<number> {
    return new CancelablePromise(this.retrieveRowsFor(database, table), async (promise, resolve) => {
      const rows = await promise
      return resolve(rows.length)
    })
  }

  /**
   * Find table
   * @param database [string]
   * @param name [string]
   */
  public getTable(database: string, name: string): MemoryTable {
    this.checkTable(database, name)
    const table = this.context[database].__tables.find(table => table.name === name)
    if (!table) throw new InMemoryError(`[FATAL] Table ${name} expected to be found in database ${databaseName(database)}`)
    return table
  }

  /**
   * Create a sandbox
   * @param database [string] optional
   */
  public prepareSandbox(database?: string): Sandbox {
    return new Sandbox(this, database)
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
        if (this.options.logger) this.options.logger.info(`Database ${databaseName(name)} created`)
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
        if (this.options.logger) this.options.logger.info(`Database ${databaseName(name)} dropped`)
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
  public predictQuery(predictJQL: PredictJQL, database?: string): TaskFn<IPredictResult> {
    this.checkInited()
    return _task => new CancelablePromise(async (resolve, _reject, check) => {
      // single query
      if (predictJQL.jql.length === 1) {
        const query = new AnalyzedQuery(predictJQL.jql[0] as Query, database)
        const compiled = new CompiledQuery(query, {
          axiosInstance: this.options.axiosInstance,
          defDatabase: query.defDatabase,
          getTable: this.getTable.bind(this),
          functions: this.functions,
        })
        return resolve({ columns: compiled.table.columns, time: 0 })
      }

      // multiple query
      const sandbox = this.prepareSandbox(database)
      const options = { axiosInstance: this.options.axiosInstance } as Partial<ICompileOptions>
      for (let i = 0, length = predictJQL.jql.length; i < length; i += 1) {
        const jql = predictJQL.jql[i]
        if (i === predictJQL.jql.length - 1) {
          const query = new AnalyzedQuery(predictJQL.jql[i] as Query, database)
          const compiled = new CompiledQuery(query, {
            ...options,
            getTable: (database, table) => sandbox.getTable(database, table) || this.getTable(database, table),
            functions: {
              ...this.functions,
              ...(options.functions || {}),
            },
          })
          return resolve({ columns: compiled.table.columns, time: 0 })
        }
        else if (jql instanceof CreateJQL) {
          await sandbox.prepare(jql, options)
        }
      }
    })
  }

  // @override
  public executeQuery(jql: AnalyzedQuery, noLog?: boolean): TaskFn<IQueryResult> {
    this.checkInited()
    const compiled = new CompiledQuery(jql, {
      axiosInstance: this.options.axiosInstance,
      defDatabase: jql.defDatabase,
      getTable: this.getTable.bind(this),
      functions: this.functions,
    })
    return task => new CancelablePromise(
      this.prepareSandbox(jql.defDatabase).run(compiled),
      async (promise, resolve, _reject, check) => {
        const start = Date.now()

        // wait for table lock
        task.status(StatusCode.WAITING)
        for (const name of compiled.options.tablesOrder) {
          const table = compiled.options.tables[name]
          await table.lock.read()
        }

        try {
          // run query
          task.status(StatusCode.RUNNING)
          const result = await promise

          // return
          if (this.options.logger && !noLog) this.options.logger.info(jql.toString(), `- ${Date.now() - start}ms`)
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

  /**
   * Check if engine initialized
   */
  protected checkInited(): void {
    if (!this.inited) throw new NotInitedError(InMemoryDatabaseEngine)
  }

  /**
   * Check database exists
   * @param database [string]
   */
  protected checkDatabase(database: string): void {
    if (checkNull(this.context[database])) throw new NotFoundError(`Database ${databaseName(database)} not found`)
  }

  /**
   * Check table exists in database
   * @param database [string]
   * @param table [string]
   */
  protected checkTable(database: string, table: string): void {
    this.checkDatabase(database)
    if (!this.context[database].__tables.find(({ name }) => name === table)) throw new NotFoundError(`Table ${table} not found in database ${databaseName(database)}`)
  }

  /**
   * Create table
   * @param jql [CreateTableJQL]
   */
  protected createTable(jql: CreateTableJQL): TaskFn<IUpdateResult> {
    // parse args
    const { $temporary, database, name, $ifNotExists, columns, constraints, options, $as } = jql

    // check args
    if (!database) throw new InMemoryError('No database is selected')
    if (name === '__tables') throw new InMemoryError('Reserved keyword __tables')

    return task => new CancelablePromise(async (resolve, _reject, check) => {
      task.status(StatusCode.RUNNING)
      let count = 0
      try {
        // check table
        this.checkTable(database, name)
        if (!$ifNotExists) throw new ExistsError(`Table ${name} already exists in database ${databaseName(database)}`)
      }
      catch (e) {
        if (!(e instanceof NotFoundError)) throw e

        // create table
        let table: MemoryTable, values: any[] = []
        if ($as) {
          const result = await this.executeQuery($as as AnalyzedQuery)(task)
          const resultset = new Resultset(result)
          table = new MemoryTable($temporary, name, result.columns, constraints, ...(options || []))
          values = resultset.toArray()
        }
        else {
          table = new MemoryTable($temporary, name, columns as Column[], constraints, ...(options || []))
        }
        this.context[database].__tables.push(table)
        this.context[database][name] = values

        // return
        if (this.options.logger) this.options.logger.info(`Table ${name}(${table.columns.map(({ name }) => name).join(', ')}) created in database ${database}`)
        count = 1
      }

      // end task
      task.status(StatusCode.ENDING)
      return resolve({ count, time: 0 })
    })
  }

  /**
   * Drop table
   * @param jql [DropTableJQL]
   */
  protected dropTable(jql: DropTableJQL): TaskFn<IUpdateResult> {
    // parse args
    const { database, name, $ifExists } = jql

    // check args
    if (!database) throw new InMemoryError('No database is selected')

    return task => new CancelablePromise(async (resolve, _reject, check) => {
      task.status(StatusCode.RUNNING)
      let count = 0
      try {
        // check table
        this.checkTable(database, name)

        // delete table
        const index = this.context[database].__tables.findIndex(table => table.name === name)
        if (index === -1) throw new InMemoryError(`[FATAL] Table ${name} expected to be found in database ${databaseName(database)}`)
        this.context[database].__tables.splice(index, 1)
        delete this.context[database][name]

        // return
        if (this.options.logger) this.options.logger.info(`Table ${name} dropped from database ${databaseName(database)}`)
        count = 1
      }
      catch (e) {
        if (!(e instanceof NotFoundError) || !$ifExists) throw e
      }

      // end task
      task.status(StatusCode.ENDING)
      return resolve({ count, time: 0 })
    })
  }

  /**
   * Insert into table
   * @param jql [InsertJQL]
   */
  protected insert(jql: InsertJQL): TaskFn<IUpdateResult> {
    // parse args
    const { database, name, values, query } = jql

    // check args
    if (!database) throw new InMemoryError('No database is selected')

    return task => new CancelablePromise(async (resolve, _reject, check) => {
      const start = Date.now()

      task.status(StatusCode.PREPARING)

      // check table
      this.checkTable(database, name)
      const table = this.context[database].__tables.find(table => table.name === name)
      if (!table) throw new InMemoryError(`[FATAL] Table ${name} expected to be found in database ${databaseName(database)}`)

      // acquire table lock
      task.status(StatusCode.WAITING)

      let values_: any[]
      if (query) {
        const { rows, columns } = await this.executeQuery(query as AnalyzedQuery)(task)

        if (!columns || columns.length !== (jql.columns as string[]).length) {
          throw new SyntaxError(`Columns unmatched: ${jql.toString()}`)
        }

        const columns_ = jql.columns as string[]
        values_ = [] as any[]
        for (let i = 0, length = rows.length; i < length; i += 1) {
          const row = rows[i]
          values_.push(columns.reduce((row_, { id }, i) => {
            row_[columns_[i]] = row[id]
            return row_
          }, {} as any))
        }
      }
      else {
        values_ = values || []
      }

      await table.lock.write()

      try {
        task.status(StatusCode.RUNNING)

        const nValues = [] as any[]
        for (const row of values_) {
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
        if (this.options.logger) this.options.logger.info(`Inserted ${nValues.length} rows into table ${name} in database ${databaseName(database)}`, `- ${Date.now() - start}ms`)
        return resolve({ count: nValues.length, time: 0 })
      }
      finally {
        // release table lock
        table.lock.writeEnd()
      }
    })
  }
}
