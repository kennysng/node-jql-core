import _ = require('lodash')
import { denormalize, normalize } from 'node-jql'
import timsort = require('timsort')
import { DatabaseEngine } from '.'
import { TEMP_DB_KEY } from '../../core'
import { IDataSource, IMapping, IQueryResult, IRow } from '../../core/interfaces'
import { Schema } from '../../schema'
import { JQLError } from '../../utils/error'
import { CursorReachEndError } from '../../utils/error/CursorReachEndError'
import { EmptyResultsetError } from '../../utils/error/EmptyResultsetError'
import { isUndefined } from '../../utils/isUndefined'
import { IExpressionWithKey } from './compiledSql'
import { Cursors, DummyCursor, ICursor } from './cursor'
import { RowsCursor } from './cursor/rows'
import { TableCursor } from './cursor/table'
import { CompiledConditionalExpression } from './expression'
import { CompiledFunctionExpression } from './expression/function'
import { CompiledQuery } from './query'
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

    // simple SELECT * FROM table or SELECT COUNT(expr) FROM table
    if (query.isSimpleQuery || query.isSimpleCount) {
      promise = promise
        .then(() => {
          const { databaseKey, tableKey, key } = (query.$from as CompiledTableOrSubquery[])[0]
          return this.getContext(databaseKey, tableKey)
            .then(rows => {
              if (rows.length === 0) throw new EmptyResultsetError()
              return rows
            })
            .then(rows => options.exists ? [rows[0]] : rows.map(row_ => {
              const row = {} as IRow
              for (const key_ in row_) row[`${key}-${key_}`] = row_[key_]
              return row
            }))
        })

      if (query.isSimpleCount) {
        promise = promise
          .then(result => {
            const { expression, key } = query.$select[0]
            return new RowsCursor(result).moveToFirst()
              .then(cursor => expression.evaluate(cursor, this))
              .then(({ value }) => [{ [key]: value }])
          })
      }
    }
    // no $from clause
    else if (!query.$from) {
      const cursor = options.cursor || new DummyCursor()
      promise = promise.then(() =>
        Promise.resolve(!query.$where || query.$where.evaluate(cursor, this).then(({ value }) => value))
          .then(flag => flag ? this.processCursor(cursor, query.$select, []) : []),
      )
    }
    else {
      // prepare temporary Tables
      if (query.needTempTables) {
        const $from = query.$from
        promise = promise.then(() => Promise.all($from.map<Promise<void>>(tableOrSubquery => this.prepareTable(tableOrSubquery, options.cursor))))
      }

      // TODO optimize queries with InExpression with independent subqueries -> prepare the temp table(s) first
      // TODO set InExpression.tempTable

      const cursors = query.$from.map(tableOrSubquery => new TableCursor(this, tableOrSubquery, options.cursor))
      const cursor: ICursor = cursors.length > 1 ? new Cursors(cursors) : cursors[0]

      // get immediate result set
      promise = promise.then(() =>
        this.traverseCursor(cursor, query, query.columns, query.$where, options)
          .then(result => {
            if (result.length === 0) throw new EmptyResultsetError()
            return result
          })
          .catch(e => {
            if (e instanceof CursorReachEndError) {
              return []
            }
            throw e
          }),
      )

      // grouping
      if (query.$group) {
        const $group = query.$group
        promise = (promise as Promise<IRow[]>)
          .then(result =>
            this.traverseCursor(new RowsCursor(result), query, $group.expressions, undefined, options)
              .then(result_ => this.mergeRows(result, result_)),
          )
          .then<_.Dictionary<IRow[]>>(result => _.groupBy(result, row => $group.expressions.map(({ key }) => normalize(row[key])).join(':')))
      }

      // w/ aggregation
      if (query.needAggregate) {
        if (!query.$group) {
          promise = promise.then(result => ({ default: result }) as _.Dictionary<IRow[]>)
        }

        const $having = query.$group ? query.$group.$having : undefined

        promise = (promise as Promise<_.Dictionary<IRow[]>>)
          .then(result => Promise.all(Object.keys(result).map(key => {
            const rows = result[key]
            return this.aggregate(rows, query.aggregateFunctions)
              .then(row => Object.assign({}, rows[0], row))
          })))
          .then(result =>
            this.traverseCursor(new RowsCursor(result), query, query.$order ? (query.$select as IExpressionWithKey[]).concat(query.$order) : query.$select, $having, options, true),
          )
      }
      // w/o aggregation
      else {
        promise = promise.then(result =>
          this.traverseCursor(new RowsCursor(result), query, query.$order ? (query.$select as IExpressionWithKey[]).concat(query.$order) : query.$select, undefined, options, true)
            .catch(e => {
              if (e instanceof CursorReachEndError) {
                return []
              }
              throw e
            }),
        )
      }
    }

    // distinct
    if (query.$distinct) {
      promise = (promise as Promise<IRow[]>).then<IRow[]>(data => _.uniqBy(data, row => query.$select.map(({ key }) => normalize(row[key])).join(':')))
    }

    // ordering
    if (query.$order) {
      const $order = query.$order
      promise = (promise as Promise<IRow[]>).then<IRow[]>(data => {
        timsort.sort(data, (l, r) => {
          for (const { key } of $order) {
            if (normalize(l[key]) < normalize(r[key])) return -1
            if (normalize(l[key]) > normalize(r[key])) return 1
          }
          return 0
        })
        return data
      })
    }

    return (promise as Promise<IRow[]>)
      // limit and offset
      .then(result => query.hasLimitOffset ? result.slice(query.$offset, query.$limit) : result)
      // remove redundant columns
      .then(result => result.map(row => query.$select.reduce((result, { key }) => {
        result[key] = row[key]
        return result
      }, {} as IRow)))
      // finalize
      .then<IQueryResult>(result => ({
        mappings: query.mappings,
        data: result,
        time: Date.now() - base,
      }))
      // if result set should be empty
      .catch(e => {
        if (e instanceof EmptyResultsetError) {
          return {
            mappings: query.mappings,
            data: [],
            time: Date.now() - base,
          }
        }
        throw e
      })
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

  private traverseCursor(cursor: ICursor, query: CompiledQuery, columns: IExpressionWithKey[], $where: CompiledConditionalExpression|undefined, options: IQueryOptions, finalize = false, movedToFirst = false, resultset: IRow[] = []): Promise<IRow[]> {
    return new Promise((resolve, reject) => {
      (movedToFirst ? cursor.next() : cursor.moveToFirst())
        .then(cursor => resolve(
          Promise.resolve(options.cursor ? new Cursors([options.cursor, cursor], '+') : cursor)
            .then(cursor =>
              Promise.resolve(!$where || $where.evaluate(cursor, this).then(({ value }) => value))
                .then<IRow[]>(flag => flag ? this.processCursor(cursor, columns, resultset) : resultset),
            )
            .then(() => {
              if (options.exists && (finalize || !query.$group) && resultset.length > 0) {
                return resultset
              }
              else if (query.isFastQuery && resultset.length === query.$offset + query.$limit) {
                return resultset
              }
              // TODO optimize queries with InExpression -> return if the required value exists
              else {
                return this.traverseCursor(cursor, query, columns, $where, options, finalize, true, resultset)
              }
            }),
        ))
        .catch(e => {
          return e instanceof CursorReachEndError ? resolve(resultset) : reject(e)
        })
    })
  }

  private processCursor(cursor: ICursor, expressions: IExpressionWithKey[], resultset: IRow[] = []): Promise<IRow[]> {
    return this.getCursorColumns(cursor, expressions)
      .then(row => resultset.push(row))
      .then(() => resultset)
  }

  private getCursorColumns(cursor: ICursor, expressions: IExpressionWithKey[], row: IRow = {}): Promise<IRow> {
    return Promise.all(expressions.map(({ expression, key }) => {
      const value = cursor.get(key)
      if (!isUndefined(value)) return row[key] = value
      return expression.evaluate(cursor, this)
        .then(({ value, type }) => row[key] = denormalize(value, type))
    }))
      .then(() => row)
  }

  private mergeRows(l: IRow[], r: IRow[]): IRow[] {
    if (l.length !== r.length) throw new JQLError('FATAL Fail to merge 2 sets of rows with different length')
    const result = [] as IRow[]
    for (let i = 0, length = l.length; i < length; i += 1) {
      result[i] = Object.assign({}, l[i], r[i])
    }
    return result
  }

  private aggregate(rows: IRow[], columns: Array<IExpressionWithKey<CompiledFunctionExpression>>, row: IRow = {}): Promise<IRow> {
    return Promise.all(columns.map(({ expression, key }) =>
    new RowsCursor(rows).moveToFirst()
      .then(cursor => expression.evaluate(cursor, this))
      .then(({ value, type }) => denormalize(value, type))
      .then(value => row[key] = value),
    ))
      .then(() => row)
  }
}
