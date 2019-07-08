import { CancelablePromise } from '@kennysng/c-promise'
import _ from 'lodash'
import { normalize } from 'path'
import timsort = require('timsort')
import uuid = require('uuid/v4')
import { InMemoryDatabaseEngine } from '.'
import { TEMP_DB_NAME } from '../core/constants'
import { IQueryResult } from '../core/result'
import { NoDatabaseError } from '../utils/error/NoDatabaseError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { Cursor } from './cursor'
import { Cursors } from './cursor/cursors'
import { DummyCursor } from './cursor/dummy'
import { TableCursor } from './cursor/table'
import { CompiledQuery } from './query'
import { CompiledFromTable } from './query/FromTable'
import { Column, Table } from './table'

/**
 * Options required for running query
 */
export interface IQueryOptions {
  /**
   * Return when there exists 1 row
   */
  exists?: Boolean

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

  /**
   * @param engine [InMemoryDatabaseEngine]
   */
  constructor(private readonly engine: InMemoryDatabaseEngine, public readonly defDatabase?: string) {
  }

  /**
   * Get the row count of a table
   * @param database [string]
   * @param table [string]
   */
  public getCountOf(database: string, table: string): number {
    if (!this.context[database]) throw new NotFoundError(`Database ${database} not found`)
    if (!this.context[database][table]) throw new NotFoundError(`Table ${table} not found in database ${database}`)
    return this.context[database][table].length
  }

  /**
   * Get the row of a table
   * @param database [string]
   * @param table [string]
   * @param i [number]
   */
  public getRowOf(database: string, table: string, i: number): any {
    if (!this.context[database]) throw new NotFoundError(`Database ${database} not found`)
    if (!this.context[database][table]) throw new NotFoundError(`Table ${table} not found in database ${database}`)
    return this.context[database][table][i]
  }

  /**
   * Run query
   * @param jql [CompiledQuery]
   * @param options [Partial<IQueryOptions>]
   */
  public run(jql: CompiledQuery, options: Partial<IQueryOptions> = {}): CancelablePromise<IQueryResult> {
    const requests: CancelablePromise[] = []
    const promise = new CancelablePromise<IQueryResult>(async (resolve, reject, check, canceled) => {
      check()

      // prepare temp tables
      if (jql.$from) {
        await Promise.all(jql.$from.map(table => this.prepareTable(table, requests).then(check)))
        check()
      }

      // quick query
      if (jql.isQuick || jql.isQuickCount) {
        let { database, table } = (jql.$from as [CompiledFromTable])[0]
        database = database || this.defDatabase
        if (!database) throw new NoDatabaseError()

        let rows = this.context[database][table.name]
        const columns = jql.table.columns

        if (jql.isQuickCount) {
          rows = [{ [columns[0].name]: rows.length }]
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
        check()

        // build cursor
        let cursor: Cursor = new DummyCursor()
        if (jql.$from) {
          const cursors = jql.$from.map(table => new TableCursor(this, table))
          cursor = new Cursors(...cursors)
        }

        // traverse cursor
        let intermediate = [] as any[]
        if (await cursor.moveToFirst()) {
          do {
            check()

            if (!jql.$where || await jql.$where.evaluate(this, cursor)) {
              check()

              const row = {} as any
              for (const { id, expression } of jql.$select) {
                row[id] = await expression.evaluate(this, cursor)
                check()
              }
              if (jql.$group) {
                for (let i = 0, length = jql.$group.expressions.length; i < length; i += 1) {
                  const id = jql.$group.id[i]
                  const expression = jql.$group.expressions[i]
                  row[id] = await expression.evaluate(this, cursor)
                  check()
                }
              }
              if (jql.$order) {
                for (const { id, expression } of jql.$order) {
                  row[id] = await expression.evaluate(this, cursor)
                  check()
                }
              }
              intermediate.push(row)

              // check exists
              if (options.exists && intermediate.length) {
                const key = uuid()
                return resolve({ rows: [{ [key]: true }], columns: [new Column(key, 'exists', 'boolean')], time: 0 })
              }

              // quick return
              if (jql.hasShortcut && intermediate.length >= $offset + $limit) {
                return resolve({ rows: intermediate, columns: jql.table.columns, time: 0 })
              }
            }
          }
          while (await cursor.next())
          check()
        }
        if (!intermediate.length) return resolve({ rows: intermediate, columns: [], time: 0 })

        // TODO GROUP BY

        // ORDER BY
        if (jql.$order) {
          const $order = jql.$order
          timsort.sort(intermediate, (l, r) => {
            for (const { id } of $order) {
              if (normalize(l[id]) < normalize(r[id])) return -1
              if (normalize(l[id]) > normalize(r[id])) return 1
            }
            return 0
          })
        }

        // DISTINCT
        if (jql.$distinct) intermediate = _.sortedUniqBy(intermediate, row => jql.$select.map(({ id }) => normalize(row[id])).join(':'))

        // LIMIT & OFFSET
        if (jql.$limit) intermediate = intermediate.slice($offset, $limit)

        return resolve({
          rows: intermediate.map(row => {
            const row_ = {} as any
            for (const { id } of jql.$select) row_[id] = row[id]
            return row_
          }),
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
        for (const { id, name } of result.columns) row_[name] = row[id]
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
