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
  public abstract async retrieveRowsFor(database: string, table: string): Promise<any[]>

  /**
   * Get the row count of a table
   * @param database [string] database name
   * @param table [string] table name
   */
  public abstract async getCountOf(database: string, table: string): Promise<number>

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
