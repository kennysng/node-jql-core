import { CancelableAxiosPromise, CancelablePromise } from '@kennysng/c-promise'
import { InMemoryDatabaseEngine } from '.'
import { TEMP_DB_NAME } from '../core'
import { IQueryResult } from '../core/result'
import { Cursor } from './cursor'
import { CompiledQuery } from './query'
import { CompiledFromTable } from './query/FromTable'
import { Table } from './table'

/**
 * Options required for running query
 */
export interface IQueryOptions {
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
   * Run query
   * @param jql [CompiledQuery]
   * @param options [Partial<IQueryOptions>]
   */
  public run(jql: CompiledQuery, options: Partial<IQueryOptions> = {}): CancelablePromise<IQueryResult> {
    const requests: CancelableAxiosPromise[] = []
    const promise = new CancelablePromise<IQueryResult>(async (resolve, reject, check, canceled) => {
      check()

      // prepare temp tables
      if (jql.$from) {
        for (const table of jql.$from) {
          await this.prepareTable(table)
          check()
        }
      }

      // TODO
      return resolve({ rows: [], columns: [], time: 0 })
    })
    // cancel axios requests
    promise.on('cancel', () => {
      for (const request of requests) request.cancel()
    })
    return promise
  }

  private async prepareTable({ table, remote, query, joinClauses }: CompiledFromTable): Promise<void> {
    // remote table
    if (remote) {
      const result = await remote()
      this.context[TEMP_DB_NAME].__tables.push(table)
      this.context[TEMP_DB_NAME][table.name] = result.data
    }
    // subquery
    else if (query) {
      const result = await this.run(query)
      this.context[TEMP_DB_NAME].__tables.push(table)
      this.context[TEMP_DB_NAME][table.name] = result.rows
    }
    // join clauses
    for (const { table } of joinClauses) await this.prepareTable(table)
  }
}
