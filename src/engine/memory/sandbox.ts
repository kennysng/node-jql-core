import { CancelablePromise } from '@kennysng/c-promise'
import _ from 'lodash'
import { denormalize, normalize } from 'node-jql'
import timsort = require('timsort')
import { TEMP_DB_KEY } from '../../core'
import { IDataSource, IQueryResult, IRow } from '../../core/interfaces'
import { Schema } from '../../schema'
import { JQLError } from '../../utils/error'
import { CursorReachEndError } from '../../utils/error/CursorReachEndError'
import { EmptyResultsetError } from '../../utils/error/EmptyResultsetError'
import isUndefined from '../../utils/isUndefined'
import { DatabaseEngine } from '../core'
import { Cursors, DummyCursor, ICursor } from '../core/cursor'
import { RowsCursor } from '../core/cursor/rows'
import { IExpressionWithKey } from './compiledSql'
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
  public readonly schema = new Schema()

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
  public async getCount(databaseNameOrKey: string, nameOrKey: string): Promise<number> {
    if (databaseNameOrKey === TEMP_DB_KEY) {
      const table = this.schema.getDatabase(TEMP_DB_KEY).getTable(nameOrKey)
      const rows = (this.context[TEMP_DB_KEY][table.key] || []) as IRow[]
      return rows.length
    }
    else {
      return this.engine.getCount(databaseNameOrKey, nameOrKey)
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

  public async getContext(databaseNameOrKey: string, tableNameOrKey: string, rowIndex?: number): Promise<IRow|IRow[]> {
    if (databaseNameOrKey === TEMP_DB_KEY) {
      const table = this.schema.getDatabase(TEMP_DB_KEY).getTable(tableNameOrKey)
      return rowIndex === undefined ? this.context[TEMP_DB_KEY][table.key] : this.context[TEMP_DB_KEY][table.key][rowIndex]
    }
    else {
      return rowIndex === undefined ? this.engine.getContext(databaseNameOrKey, tableNameOrKey) : this.engine.getContext(databaseNameOrKey, tableNameOrKey, rowIndex)
    }
  }

  /**
   * Run a CompiledQuery
   * @param query [CompiledQuery]
   * @param options [IQueryOptions] Some query options for e.g. optimization
   */
  public run(query: CompiledQuery, options: IQueryOptions = {}): CancelablePromise<IQueryResult> {
    const promise = new CancelablePromise(async (resolve, reject, checkCancel) => {
      const base = Date.now()
      let result: IRow[]

      try {
        // prepare temporary Tables
        if (query.needTempTables && query.$from) {
          const $from = query.$from
          await Promise.all($from.map<Promise<void>>(tableOrSubquery => {
            checkCancel()
            return this.prepareTable(tableOrSubquery, options.cursor)
          }))
          checkCancel()
        }

        // simple SELECT * FROM table or SELECT COUNT(expr) FROM table
        if (query.isSimpleQuery || query.isSimpleCount) {
          const { databaseKey, tableKey, key } = (query.$from as CompiledTableOrSubquery[])[0]
          checkCancel()
          const rows = await this.getContext(databaseKey, tableKey)
          checkCancel()
          if (!rows.length) throw new EmptyResultsetError()
          result = options.exists ? [rows[0]] : rows.map(row_ => {
            const row = {} as IRow
            for (const key_ in row_) row[`${key}-${key_}`] = row_[key_]
            return row
          })

          if (query.isSimpleCount) {
            const { expression, key } = query.$select[0]
            let cursor = new RowsCursor(result)
            checkCancel()
            cursor = await cursor.moveToFirst()
            checkCancel()
            const { value } = await expression.evaluate(cursor, this)
            checkCancel()
            result = [{ [key]: value }]
          }
        }

        // no $from clause
        else if (!query.$from) {
          const cursor = options.cursor || new DummyCursor()
          checkCancel()
          const flag = !query.$where || (await query.$where.evaluate(cursor, this)).value
          checkCancel()
          result = flag ? await this.processCursor(cursor, query.$select, []) : []
          checkCancel()
        }

        // complete flow
        else {
          // TODO optimize queries with InExpression with independent subqueries -> prepare the temp table(s) first
          // TODO set InExpression.tempTable

          const cursors = query.$from.map(tableOrSubquery => new TableCursor(this, tableOrSubquery, options.cursor))
          const cursor: ICursor = cursors.length > 1 ? new Cursors(cursors) : cursors[0]

          // get immediate result set
          try {
            checkCancel()
            result = await this.traverseCursor(cursor, query, query.columns, query.$where, options)
            checkCancel()
          }
          catch (e) {
            throw e instanceof CursorReachEndError ? new EmptyResultsetError() : e
          }
          if (result.length === 0) throw new EmptyResultsetError()

          // grouping
          let dictionary: _.Dictionary<IRow[]> = {}
          if (query.$group) {
            const $group = query.$group
            checkCancel()
            const result_ = await this.traverseCursor(new RowsCursor(result), query, $group.expressions, undefined, options)
            checkCancel()
            result = this.mergeRows(result, result_)
            dictionary = _.groupBy(result, row => $group.expressions.map(({ key }) => normalize(row[key])).join(':'))
          }

          // w/ aggregation
          if (query.needAggregate) {
            if (!query.$group) dictionary = { default: result }
            const $having = query.$group ? query.$group.$having : undefined
            const promises = Object.keys(dictionary).map(async key => {
              const rows = dictionary[key]
              checkCancel()
              const row = await this.aggregate(rows, query.aggregateFunctions)
              checkCancel()
              return Object.assign({}, rows[0], row)
            })
            result = await Promise.all(promises)
            checkCancel()
            result = await this.traverseCursor(new RowsCursor(result), query, query.$order ? (query.$select as IExpressionWithKey[]).concat(query.$order) : query.$select, $having, options, true)
            checkCancel()
          }

          // w/o aggregation
          else {
            try {
              checkCancel()
              result = await this.traverseCursor(new RowsCursor(result), query, query.$order ? (query.$select as IExpressionWithKey[]).concat(query.$order) : query.$select, undefined, options, true)
              checkCancel()
            }
            catch (e) {
              throw e instanceof CursorReachEndError ? new EmptyResultsetError() : e
            }
          }
        }

        // distinct
        if (query.$distinct) {
          result = _.uniqBy(result, row => query.$select.map(({ key }) => normalize(row[key])).join(':'))
        }

        // ordering
        if (query.$order) {
          const $order = query.$order
          timsort.sort(result, (l, r) => {
            for (const { key } of $order) {
              if (normalize(l[key]) < normalize(r[key])) return -1
              if (normalize(l[key]) > normalize(r[key])) return 1
            }
            return 0
          })
        }

        // limit and offset
        if (query.hasLimitOffset) {
          result = result.slice(query.$offset, query.$limit)
        }

        // remove redundant columns
        result = result.map(row => query.$select.reduce((result, { key }) => {
          result[key] = row[key]
          return result
        }, {} as IRow))

        // save as temp table
        if (query.$createTempTable) {
          const tempTable = query.structure
          this.context[TEMP_DB_KEY][tempTable.key] = result
          this.schema.getDatabase(TEMP_DB_KEY).createTable(query.$createTempTable, tempTable.key, tempTable.columns)
        }

        return resolve({
          mappings: query.mappings,
          data: result,
          time: Date.now() - base,
        })
      }
      catch (e) {
        if (e instanceof EmptyResultsetError) {
          return resolve({
            mappings: query.mappings,
            data: [],
            time: Date.now() - base,
          })
        }
        return reject(e)
      }
    })

    promise.on('cancel', () => {
      if (query.$from) {
        for (const { request } of query.$from) {
          if (request) request.cancel()
        }
      }
    })
    return promise
  }

  private async prepareTable(tableOrSubquery: CompiledTableOrSubquery, cursor?: ICursor): Promise<void> {
    // Remote Table
    if (tableOrSubquery.remote && tableOrSubquery.request) {
      const table = tableOrSubquery.remote
      this.schema.getDatabase(TEMP_DB_KEY).createTable(table.name, table.key, table.columns)

      const response = await tableOrSubquery.request
      this.context[TEMP_DB_KEY][tableOrSubquery.remote.key] = response.data.map(row => table.columns.reduce<IRow>((result, { name, key }) => {
        result[key] = row[name]
        return result
      }, {}))
    }

    // Table from Query
    if (tableOrSubquery.query) {
      const query = tableOrSubquery.query
      const table = query.structure
      this.schema.getDatabase(TEMP_DB_KEY).createTable(table.name, table.key, table.columns)
      const { data } = await this.run(query, { cursor })
      this.context[TEMP_DB_KEY][table.key] = data
    }

    // Joined Table
    if (tableOrSubquery instanceof CompiledJoinedTableOrSubquery) {
      const joinClauses = tableOrSubquery.joinClauses
      const promises = joinClauses.map(joinClause => this.prepareTable(joinClause.tableOrSubquery, cursor))
      await Promise.all(promises)
    }
  }

  private async traverseCursor(cursor: ICursor, query: CompiledQuery, columns: IExpressionWithKey[], $where: CompiledConditionalExpression|undefined, options: IQueryOptions, finalize = false, resultset: IRow[] = []): Promise<IRow[]> {
    let movedToFirst = false
    while (true) {
      try {
        let tmpCursor = movedToFirst ? await cursor.next() : await cursor.moveToFirst()
        movedToFirst = true
        if (options.cursor) tmpCursor = new Cursors([options.cursor, tmpCursor], '+')
        if (!$where || (await $where.evaluate(tmpCursor, this)).value) {
          resultset = await this.processCursor(tmpCursor, columns, resultset)
        }
        if (
          (options.exists && (finalize || !query.$group) && resultset.length > 0) ||
          (query.isFastQuery && resultset.length === query.$offset + query.$limit)
        ) {
          return resultset
        }
      }
      catch (e) {
        if (e instanceof CursorReachEndError) return resultset
        throw e
      }
    }
  }

  private async processCursor(cursor: ICursor, expressions: IExpressionWithKey[], resultset: IRow[] = []): Promise<IRow[]> {
    resultset.push(await this.getCursorColumns(cursor, expressions))
    return resultset
  }

  private async getCursorColumns(cursor: ICursor, expressions: IExpressionWithKey[], row: IRow = {}): Promise<IRow> {
    const promises = expressions.map(async ({ expression, key }) => {
      const cValue = await cursor.get(key)
      if (!isUndefined(cValue)) return row[key] = cValue
      const { value, type } = await expression.evaluate(cursor, this)
      row[key] = denormalize(value, type)
    })
    await Promise.all(promises)
    return row
  }

  private mergeRows(l: IRow[], r: IRow[]): IRow[] {
    if (l.length !== r.length) throw new JQLError('FATAL Fail to merge 2 sets of rows with different length')
    const result = [] as IRow[]
    for (let i = 0, length = l.length; i < length; i += 1) {
      result[i] = Object.assign({}, l[i], r[i])
    }
    return result
  }

  private async aggregate(rows: IRow[], columns: Array<IExpressionWithKey<CompiledFunctionExpression>>, row: IRow = {}): Promise<IRow> {
    const promises = columns.map(async ({ expression, key }) => {
      let cursor = new RowsCursor(rows)
      cursor = await cursor.moveToFirst()
      const { value, type } = await expression.evaluate(cursor, this)
      row[key] = denormalize(value, type)
    })
    await Promise.all(promises)
    return row
  }
}
