import { CancelablePromise } from '@kennysng/c-promise'
import { JQL } from 'node-jql'
import { AnalyzedQuery } from './query'
import { IQueryResult, IUpdateResult } from './result'
import { TaskFn } from './task'

/**
 * Definition of a database engine
 */
export abstract class DatabaseEngine {
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
   * Execute a SELECT JQL
   * @param jql [AnalyzedQuery]
   */
  public abstract executeQuery(jql: AnalyzedQuery): TaskFn<IQueryResult>
}