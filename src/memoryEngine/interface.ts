import { AxiosInstance } from 'axios'
import { ILogger } from '../utils/logger'
import { Cursor } from './cursor'
import { CompiledColumnExpression } from './expr/expressions/ColumnExpression'
import { CompiledFunctionExpression } from './expr/expressions/FunctionExpression'
import { JQLFunction } from './function'
import { Sandbox } from './sandbox'
import { MemoryTable } from './table'

/**
 * In-memory database engine options
 */
export interface IInMemoryOptions {
  /**
   * Default axios instance
   */
  axiosInstance?: AxiosInstance

  /**
   * Custom logging
   */
  logger?: ILogger

  /**
   * Time gap between each cancel check
   * The smaller the time gap, the more sensitive the cancel trigger, the higher the overhead
   */
  checkWindowSize?: number
}

/**
 * Options required for compilation
 */
export interface ICompileOptions {
  /**
   * Get table function
   */
  getTable: (database: string, table: string) => MemoryTable

  /**
   * Subquery with name
   */
  $as?: string

  /**
   * Default axios instance
   */
  axiosInstance?: AxiosInstance

  /**
   * Default database
   */
  defDatabase?: string

  /**
   * Tables available
   */
  tables: _.Dictionary<MemoryTable>

  /**
   * Table list corresponding to the current query
   */
  ownTables: string[]

  /**
   * Table order
   */
  tablesOrder: string[]

  /**
   * Columns required
   */
  columns: CompiledColumnExpression[]

  /**
   * List of aggregate functions used
   */
  aggregateFunctions: CompiledFunctionExpression[]

  /**
   * List of available functions
   */
  functions: _.Dictionary<() => JQLFunction>
}

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
