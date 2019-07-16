import { CancelablePromise } from '@kennysng/c-promise'
import { JQL, PredictJQL } from 'node-jql'
import { IPredictResult, IQueryResult, IUpdateResult } from './interface'
import { AnalyzedQuery } from './query'
import { TaskFn } from './task'

/**
 * Definition of a database engine
 */
export abstract class DatabaseEngine {
  /**
   * Whether PREDICT syntax supported
   */
  public readonly isPredictSupported: boolean

  protected initing = false
  protected inited = false

  /**
   * Initialize the engine
   */
  public abstract async init(): Promise<void>

  /**
   * Retrieve all rows from a table
   * @param database [string] database name
   * @param table [string] table name
   */
  public abstract retrieveRowsFor(database: string, table: string): CancelablePromise<any[]>

  /**
   * Get the row count of a table
   * @param database [string] database name
   * @param table [string] table name
   */
  public abstract getCountOf(database: string, table: string): CancelablePromise<number>

  /**
   * Create a database
   * @param name [string]
   */
  public abstract createDatabase(name: string): TaskFn<IUpdateResult>

  /**
   * Drop a database
   * @param name [string]
   */
  public abstract dropDatabase(name: string): TaskFn<IUpdateResult>

  /**
   * Execute an UPDATE JQL
   * @param jql [JQL]
   */
  public abstract executeUpdate(jql: JQL): TaskFn<IUpdateResult>

  /**
   * Predict the result structure of a SELECT JQL
   * @param jql [PredictJQL]
   * @param database [string]
   */
  public abstract predictQuery(jql: PredictJQL, database?: string): TaskFn<IPredictResult>

  /**
   * Execute a SELECT JQL
   * @param jql [AnalyzedQuery]
   */
  public abstract executeQuery(jql: AnalyzedQuery): TaskFn<IQueryResult>
}
