import { DatabaseEngine } from '.'
import { TEMP_DB_KEY } from '../../core'
import { IDataSource, IQueryResult, IRow } from '../../core/interfaces'
import { Schema } from '../../schema'
import { Table } from '../../schema/table'
import { CompiledQuery } from '../core/query'
import { ICursor } from './cursor'
import { CompiledJoinedTableOrSubquery, CompiledTableOrSubquery } from './query/tableOrSubquery'

/**
 * InMemoryEngine-like Sandbox resolving queries
 */
export class Sandbox {
  protected readonly schema = new Schema()
  protected readonly context: IDataSource = {}

  constructor(private readonly databaseNameOrKey: string, private readonly engine: DatabaseEngine) {
    // create temporary database
    this.schema.createDatabase('Temporary', TEMP_DB_KEY)
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
   * Get the required row of data
   * @param databaseNameOrKey [string]
   * @param tableNameOrKey [string]
   * @param rowIndex [number]
   */
  public getContext(databaseNameOrKey: string, tableNameOrKey: string, rowIndex: number): Promise<IRow> {
    if (databaseNameOrKey === TEMP_DB_KEY) {
      const table = this.schema.getDatabase(TEMP_DB_KEY).getTable(tableNameOrKey)
      return Promise.resolve(this.context[TEMP_DB_KEY][table.key][rowIndex])
    }
    else {
      return Promise.resolve(this.engine.getContext(databaseNameOrKey, tableNameOrKey, rowIndex))
    }
  }

  /**
   * Run a CompiledQuery
   * @param query [CompiledQuery]
   * @param cursor [ICursor] Use as a base Cursor for ExistsExpression and InExpression
   */
  public run(query: CompiledQuery, cursor?: ICursor): Promise<IQueryResult> {
    const base = Date.now()
    let promise: Promise<any> = Promise.resolve()

    // TODO special cases, for optimized performance

    // prepare temporary Tables
    if (query.$from && this.hasTemporaryTables(query.$from)) {
      const $from = query.$from
      promise = promise.then(() => Promise.all($from.map<Promise<void>>(tableOrSubquery => this.prepareTable(tableOrSubquery))))
    }

    // TODO create cursor

    return promise.then<IQueryResult>(result => ({ ...result, time: Date.now() - base }))
  }

  private hasTemporaryTables($from: CompiledTableOrSubquery[]): boolean {
    for (const tableOrSubquery of $from) {
      if (tableOrSubquery.query) return true
      if (tableOrSubquery instanceof CompiledJoinedTableOrSubquery && this.hasTemporaryTables(tableOrSubquery.joinClauses.map(({ tableOrSubquery }) => tableOrSubquery))) return true
    }
    return false
  }

  private prepareTable(tableOrSubquery: CompiledTableOrSubquery): Promise<void> {
    let promise: Promise<any> = Promise.resolve()
    if (tableOrSubquery.query) {
      const query = tableOrSubquery.query
      const table = tableOrSubquery.tableInfo.tempTable as Table
      this.schema.getDatabase(TEMP_DB_KEY).createTable(table.name, table.key, table.columns)
      promise = promise.then(() => this.run(query)).then(({ data }) => { this.context[TEMP_DB_KEY][table.key] = data })
    }
    if (tableOrSubquery instanceof CompiledJoinedTableOrSubquery) {
      const joinClauses = tableOrSubquery.joinClauses
      promise = promise.then(() => Promise.all(joinClauses.map(joinClause => this.prepareTable(joinClause.tableOrSubquery))))
    }
    return promise
  }
}
