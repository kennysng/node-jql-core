import { CancelablePromise } from '@kennysng/c-promise'
import _ from 'lodash'
import { checkNull, CreateFunctionJQL, CreateJQL, CreateTableJQL, normalize } from 'node-jql'
import timsort = require('timsort')
import uuid = require('uuid/v4')
import { InMemoryDatabaseEngine } from '.'
import { TEMP_DB_NAME } from '../core/constants'
import { IQueryResult } from '../core/result'
import { NoDatabaseError } from '../utils/error/NoDatabaseError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { ArrayCursor, Cursor } from './cursor'
import { Cursors } from './cursor/cursors'
import { DummyCursor } from './cursor/dummy'
import { RowCursor, TableCursor } from './cursor/table'
import { UnionCursor } from './cursor/union'
import { ICompileOptions } from './expr/compile'
import { GenericJQLFunction } from './function'
import { CompiledQuery } from './query'
import { CompiledFromTable } from './query/FromTable'
import { Column, Table } from './table'

/**
 * Options required for running query
 */
export interface IQueryOptions {
  /**
   * Whether this is a subquery
   */
  subquery?: boolean

  /**
   * Return when there exists 1 row
   */
  exists?: boolean

  /**
   * Base cursor for running subquery
   */
  cursor?: Cursor
}

/**
 * Sandbox environment for running query
 */
export class Sandbox {
  public readonly context: { [key: string]: { __tables: Table[], [key: string]: any[] } } = {}
  private lastCheck = Date.now()

  /**
   * @param engine [InMemoryDatabaseEngine]
   */
  constructor(private readonly engine: InMemoryDatabaseEngine, public readonly defDatabase?: string) {
    this.context[TEMP_DB_NAME] = { __tables: [] }
  }

  /**
   * Get the row count of a table
   * @param table [CompiledFromTable]
   */
  public getCountOf(table: CompiledFromTable): number {
    const database = table.database || (this.context[TEMP_DB_NAME].__tables.find(({ name }) => name === table.$as) && TEMP_DB_NAME) || this.defDatabase
    if (!database) throw new NoDatabaseError()
    const name = table.table.name
    if (!this.context[database]) throw new NotFoundError(`Database ${database} not found`)
    if (!this.context[database][name]) throw new NotFoundError(`Table ${name} not found in database ${database}`)
    return this.context[database][name].length
  }

  /**
   * Get the row of a table
   * @param table [CompiledFromTable]
   * @param i [number]
   */
  public getRowOf(table: CompiledFromTable, i: number): any {
    const database = table.database || (this.context[TEMP_DB_NAME].__tables.find(({ name }) => name === table.$as) && TEMP_DB_NAME) || this.defDatabase
    if (!database) throw new NoDatabaseError()
    const name = table.table.name
    if (!this.context[database]) throw new NotFoundError(`Database ${database} not found`)
    if (!this.context[database]) throw new NotFoundError(`Database ${database} not found`)
    if (!this.context[database][name]) throw new NotFoundError(`Table ${name} not found in database ${database}`)
    return this.context[database][name][i] || {}
  }

  /**
   * Find table
   * @param database [string]
   * @param name [string]
   */
  public getTable(database: string, name: string): Table|undefined {
    return this.context[database].__tables.find(table => table.name === name)
  }

  /**
   * Prepare for prediction
   * @param jql [CreateJQL]
   * @param options [Partial<ICompileOptions>]
   */
  public prepare(jql: CreateJQL, options: Partial<ICompileOptions>): void {
    if (jql instanceof CreateTableJQL) {
      const database = jql.database || options.defDatabase
      if (!database) throw new NoDatabaseError()
      if (!this.context[database]) throw new NotFoundError(`Database ${database} not found in sandbox`)
      this.context[database].__tables.push(new Table(jql.name, jql.columns, jql.constraints, ...(jql.options || [])))
    }
    else if (jql instanceof CreateFunctionJQL) {
      if (!options.functions) options.functions = {}
      options.functions[jql.name] = () => new GenericJQLFunction(jql.name, jql.fn, jql.type, jql.parameters)
    }
  }

  /**
   * Run query
   * @param jql [CompiledQuery]
   * @param options [Partial<IQueryOptions>]
   */
  public run(jql: CompiledQuery, options: Partial<IQueryOptions> = {}): CancelablePromise<IQueryResult> {
    const requests: CancelablePromise[] = []
    const promise = new CancelablePromise<IQueryResult>(async (resolve, _reject, check_) => {
      const check = async () => {
        if (!options.subquery && Date.now() > this.lastCheck + this.engine.checkWindowSize) await check_()
      }

      // prepare temp tables
      if (jql.$from) {
        await Promise.all(jql.$from.map(async table => this.prepareTable(table, requests)))
      }

      // quick query
      if (jql.isQuick || jql.isQuickCount) {
        let { database, table } = (jql.$from as [CompiledFromTable])[0]
        database = database || this.defDatabase
        if (!database) throw new NoDatabaseError()

        let rows = this.context[database][table.name]
        const columns = jql.table.columns

        if (jql.isQuickCount) {
          rows = [{ [columns[0].id]: rows.length }]
        }
        else {
          rows = rows.map(row => {
            const row_ = {} as any
            for (const column of columns) row_[column.id] = row[column.name]
            return row_
          })
        }
        return resolve({ rows, columns, time: 0 })
      }
      // normal flow
      else {
        // evaluate LIMIT & OFFSET values
        const $limit = jql.$limit ? await jql.$limit.$limit.evaluate(this, new DummyCursor()) : Number.MAX_SAFE_INTEGER
        const $offset = jql.$limit && jql.$limit.$offset ? await jql.$limit.$offset.evaluate(this, new DummyCursor()) : 0

        // build cursor
        let cursor: Cursor = jql.$from ? new Cursors(...jql.$from.map(table => new TableCursor(this, table))) : new DummyCursor()

        // traverse cursor
        let rows = [] as any[]
        if (await cursor.moveToFirst()) {
          do {
            // check canceled
            await check()

            if (options.cursor) cursor = cursor instanceof DummyCursor ? options.cursor : new UnionCursor(cursor, options.cursor)

            if (!jql.$where || await jql.$where.evaluate(this, cursor)) {
              const row = {} as any
              rows.push(row)

              // registered columns
              for (const expression of jql.columns) {
                if (checkNull(row[expression.key])) row[expression.key] = await expression.evaluate(this, cursor)
              }

              // GROUP BY columns
              if (jql.$group) {
                for (let i = 0, length = jql.$group.expressions.length; i < length; i += 1) {
                  const id = jql.$group.id[i]
                  const expression = jql.$group.expressions[i]
                  if (checkNull(row[id])) row[id] = await expression.evaluate(this, cursor)
                }
              }

              // ORDER BY columns
              if (jql.$order) {
                for (const { id, expression } of jql.$order) {
                  if (checkNull(row[id])) row[id] = await expression.evaluate(this, cursor)
                }
              }

              // check exists
              if (options.exists && rows.length) {
                const key = uuid()
                return resolve({ rows: [{ [key]: true }], columns: [new Column(key, 'exists', 'boolean')], time: 0 })
              }

              // quick return
              if (jql.hasShortcut && rows.length >= $offset + $limit) {
                return resolve({ rows, columns: jql.table.columns, time: 0 })
              }
            }
          }
          while (await cursor.next())
        }
        if (!rows.length) return resolve({ rows, columns: [], time: 0 })

        // check canceled
        if (jql.needAggregate || jql.$order) await check()

        // GROUP BY
        if (jql.needAggregate) {
          let intermediate: _.Dictionary<any[]> = { __DEFAULT__: rows }
          if (jql.$group) {
            const $group = jql.$group
            intermediate = _.groupBy(rows, row => $group.id.map(id => normalize(row[id])).join(':'))
          }
          const promises = Object.keys(intermediate).map(async key => {
            let row = {} as any
            for (const expression of jql.aggregateFunctions) {
              const cursor = new ArrayCursor(intermediate[key])
              await cursor.moveToFirst()
              row[expression.id] = await expression.evaluate(this, cursor)
            }
            row = Object.assign({}, intermediate[key][0], row)
            if (!jql.$group || !jql.$group.$having || await jql.$group.$having.evaluate(this, new RowCursor(row))) {
              return row
            }
          })

          rows = (await Promise.all(promises)).filter(row => !checkNull(row))
        }

        // ORDER BY
        if (jql.$order) {
          const $order = jql.$order
          timsort.sort(rows, (l, r) => {
            for (const { id } of $order) {
              if (normalize(l[id]) < normalize(r[id])) return -1
              if (normalize(l[id]) > normalize(r[id])) return 1
            }
            return 0
          })
        }

        // check canceled
        await check()

        // SELECT
        cursor = new ArrayCursor(rows)
        rows = []
        if (await cursor.moveToFirst()) {
          do {
            const row = {} as any
            rows.push(row)

            // selected columns
            for (const { id, expression } of jql.$select) {
              if (checkNull(row[id])) {
                row[id] = await expression.evaluate(this, cursor)
              }
            }
          }
          while (await cursor.next())
        }

        // DISTINCT
        if (jql.$distinct) rows = _.sortedUniqBy(rows, row => jql.$select.map(({ id }) => normalize(row[id])).join(':'))

        // LIMIT & OFFSET
        if (jql.$limit) rows = rows.slice($offset, $limit)

        return resolve({
          rows,
          columns: jql.table.columns,
          time: 0,
        })
      }
    })
    // cancel axios requests
    promise.on('cancel', () => {
      for (const request of requests) request.cancel()
    })
    return promise
  }

  private prepareDatabase(database: string): void {
    if (!this.context[database]) this.context[database] = { __tables: [] }
  }

  private async prepareTable({ database, table, remote, query, joinClauses }: CompiledFromTable, requests: CancelablePromise[]): Promise<void> {
    // remote table
    if (remote) {
      const promise = remote()
      requests.push(promise)

      const result = await promise
      this.prepareDatabase(TEMP_DB_NAME)
      this.context[TEMP_DB_NAME].__tables.push(table)
      this.context[TEMP_DB_NAME][table.name] = result.data
    }
    // subquery
    else if (query) {
      const promise = this.run(query)
      requests.push(promise)

      const result = await promise
      this.prepareDatabase(TEMP_DB_NAME)
      this.context[TEMP_DB_NAME].__tables.push(table)
      this.context[TEMP_DB_NAME][table.name] = result.rows.map(row => {
        const row_ = {} as any
        for (const { id, name } of result.columns as Column[]) row_[name] = row[id]
        return row_
      })
    }
    // existing table
    else {
      database = database || this.defDatabase
      if (!database) throw new NoDatabaseError()
      const promise = this.engine.retrieveRowsFor(database, table.name)
      requests.push(promise)

      const result = await promise
      this.prepareDatabase(database)
      this.context[database].__tables.push(table)
      this.context[database][table.name] = result
    }
    // join clauses
    for (const { table } of joinClauses) await this.prepareTable(table, requests)
  }
}
