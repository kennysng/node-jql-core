import _ = require('lodash')
import { denormalize, Sql } from 'node-jql'
import { DatabaseEngine } from '.'
import { TEMP_DB_KEY } from '../../core'
import { IDataSource, IMapping, IQueryResult, IRow } from '../../core/interfaces'
import { Schema } from '../../schema'
import { CursorReachEndError } from '../../utils/error/CursorReachEndError'
import { IExpressionWithKey } from './compiledSql'
import { Cursors, ICursor } from './cursor'
import { TableCursor } from './cursor/table'
import { CompiledColumnExpression } from './expression/column'
import { CompiledQuery } from './query'
import { CompiledResultColumn } from './query/resultColumn'
import { CompiledJoinedTableOrSubquery, CompiledTableOrSubquery } from './query/tableOrSubquery'

export interface IQueryOptions {
  cursor?: ICursor
  exists?: boolean
}

export class Sandbox {
  protected readonly schema = new Schema()
  protected readonly context: IDataSource = {}

  constructor(private readonly engine: DatabaseEngine) {
    // create temporary database
    this.schema.createDatabase('TEMP_DB', TEMP_DB_KEY)
    this.context[TEMP_DB_KEY] = {}
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'Sandbox'
  }

  /**
   * Get the number of rows of a Table
   * @param databaseNameOrKey [string]
   * @param nameOrKey [string]
   */
  public getCount(databaseNameOrKey: string, nameOrKey: string): Promise<number> {
    if (databaseNameOrKey === TEMP_DB_KEY) {
      const table = this.schema.getDatabase(TEMP_DB_KEY).getTable(nameOrKey)
      const rows = (this.context[TEMP_DB_KEY][table.key] || []) as IRow[]
      return Promise.resolve(rows.length)
    }
    else {
      return Promise.resolve(this.engine.getCount(databaseNameOrKey, nameOrKey))
    }
  }

  /**
   * Get the required rows
   * @param databaseNameOrKey [string]
   * @param tableNameOrKey [string]
   */
  public getContext(databaseNameOrKey: string, tableNameOrKey: string): Promise<IRow[]>

  /**
   * Get the required row of data
   * @param databaseNameOrKey [string]
   * @param tableNameOrKey [string]
   * @param rowIndex [number]
   */
  public getContext(databaseNameOrKey: string, tableNameOrKey: string, rowIndex: number): Promise<IRow>

  public getContext(databaseNameOrKey: string, tableNameOrKey: string, rowIndex?: number): Promise<IRow>|Promise<IRow[]> {
    if (databaseNameOrKey === TEMP_DB_KEY) {
      const table = this.schema.getDatabase(TEMP_DB_KEY).getTable(tableNameOrKey)
      return rowIndex === undefined ? Promise.resolve(this.context[TEMP_DB_KEY][table.key]) : Promise.resolve(this.context[TEMP_DB_KEY][table.key][rowIndex])
    }
    else {
      return rowIndex === undefined ? Promise.resolve(this.engine.getContext(databaseNameOrKey, tableNameOrKey)) : Promise.resolve(this.engine.getContext(databaseNameOrKey, tableNameOrKey, rowIndex))
    }
  }

  /**
   * Run a CompiledQuery
   * @param query [CompiledQuery]
   * @param options [IQueryOptions] Some query options for e.g. optimization
   */
  public run(query: CompiledQuery, options: IQueryOptions = {}): Promise<IQueryResult> {
    const base = Date.now()
    let promise: Promise<any> = Promise.resolve()

    // simple SELECT * FROM table
    if (query.isSimpleQuery) {
      promise = promise
        .then(() => {
          const { databaseKey, tableKey, key } = (query.$from as CompiledTableOrSubquery[])[0]
          return this.getContext(databaseKey, tableKey)
            .then(rows => rows.map(row_ => {
              const row = {} as IRow
              for (const key_ in row_) row[`${key}-${key_}`] = row_[key_]
              return row
            }))
        })
    }
    // TODO special cases, for optimized performance
    else if (!query.$from) {
      // TODO special case, no $from clause
    }
    else {
      // prepare temporary Tables
      if (query.needTempTables) {
        const $from = query.$from
        promise = promise.then(() => Promise.all($from.map<Promise<void>>(tableOrSubquery => this.prepareTable(tableOrSubquery, options.cursor))))
      }

      const cursors = query.$from.map(tableOrSubquery => new TableCursor(this, tableOrSubquery, options.cursor))
      const cursor: ICursor = cursors.length > 1 ? new Cursors(cursors) : cursors[0]
      promise = promise.then(() => {
        return cursor.moveToFirst()
          .then((cursor: ICursor) => {
            return Promise.resolve(options.cursor ? new Cursors([options.cursor, cursor], '+') : cursor)
              .then(cursor => this.processCursor(cursor, query))
          })
          .then(resultset => this.traverseCursor(cursor, query, options, resultset))
          .catch(e => {
            if (e instanceof CursorReachEndError) {
              return []
            }
            throw e
          })
      })
      // TODO
    }

    return (promise as Promise<IRow[]>)
      .then<IQueryResult>(result => ({
        mappings: query.$select.map<IMapping>(({ expression, key, $as }) => {
          const result = { name: $as || expression.toString(), key } as IMapping
          if (expression instanceof CompiledColumnExpression) {
            result.table = expression.table
            result.column = expression.name
          }
          return result
        }),
        data: result,
        time: Date.now() - base,
      }))
  }

  private prepareTable(tableOrSubquery: CompiledTableOrSubquery, cursor?: ICursor): Promise<void> {
    let promise: Promise<any> = Promise.resolve()
    // Table from Query
    if (tableOrSubquery.query) {
      const query = tableOrSubquery.query
      const table = query.structure
      this.schema.getDatabase(TEMP_DB_KEY).createTable(table.name, table.key, table.columns)
      promise = promise.then(() => this.run(query, { cursor })).then(({ data }) => { this.context[TEMP_DB_KEY][table.key] = data })
    }
    // Joined Table
    if (tableOrSubquery instanceof CompiledJoinedTableOrSubquery) {
      const joinClauses = tableOrSubquery.joinClauses
      promise = promise.then(() => Promise.all(joinClauses.map(joinClause => this.prepareTable(joinClause.tableOrSubquery, cursor))))
    }
    return promise
  }

  private traverseCursor(cursor: ICursor, query: CompiledQuery, options: IQueryOptions, resultset: IRow[] = []): Promise<IRow[]> {
    return new Promise((resolve, reject) => {
      cursor.next()
        .then(cursor => {
          return resolve(
            Promise.resolve(options.cursor ? new Cursors([options.cursor, cursor], '+') : cursor)
              .then(cursor => this.processCursor(cursor, query, resultset))
              .then(() => options.exists && resultset.length > 0 ? resultset : this.traverseCursor(cursor, query, options, resultset)),
          )
        })
        .catch(e => {
          return e instanceof CursorReachEndError ? resolve(resultset) : reject(e)
        })
    })
  }

  private processCursor(cursor: ICursor, query: CompiledQuery, resultset: IRow[] = []): Promise<IRow[]> {
    return new Promise(resolve => {
      Promise.resolve(!query.$where || query.$where.evaluate(cursor, this).then(({ value }) => value))
        .then(flag => {
          let promise = Promise.resolve() as Promise<any>
          if (flag) {
            // columns to be shown
            promise = promise.then(() => this.getCursorColumns(cursor, query.$select))

            // columns for grouping
            if (query.$group) {
              const $group = query.$group
              promise = promise.then(row => this.getCursorColumns(cursor, $group.expressions, row))
            }

            // columns for ordering
            if (query.$order) {
              const $order = query.$order
              promise = promise.then(row => this.getCursorColumns(cursor, $order, row))
            }

            promise = promise.then(row => resultset.push(row))
          }
          return resolve(promise.then(() => resultset))
        })
    })
  }

  private getCursorColumns(cursor: ICursor, expressions: IExpressionWithKey[], row: IRow = {}): Promise<IRow> {
    return Promise.all(expressions.map(({ expression, key }) =>
      expression.evaluate(cursor, this)
        .then(({ value, type }) => row[key] = denormalize(value, type)),
    ))
      .then(() => row)
  }
}
