import { AxiosInstance } from 'axios'
import { ConditionalExpression, Expression } from 'node-jql'
import { CompiledConditionalExpression, CompiledExpression } from '.'
import { JQLFunction } from '../function'
import { Sandbox } from '../sandbox'
import { Table } from '../table'
import { ColumnExpression } from './expressions/ColumnExpression'
import { FunctionExpression } from './expressions/FunctionExpression'

/**
 * Options required for compilation
 */
export interface ICompileOptions {
  /**
   * Sandbox environment
   */
  sandbox?: Sandbox

  /**
   * Get table function
   */
  getTable: (database: string, table: string) => Table

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
  tables: _.Dictionary<Table>

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
  columns: ColumnExpression[]

  /**
   * List of aggregate functions used
   */
  aggregateFunctions: FunctionExpression[]

  /**
   * List of available functions
   */
  functions: _.Dictionary<() => JQLFunction>
}

/**
 * Compile expressions
 * @param jql [Expression]
 */
export function compile<T extends CompiledConditionalExpression>(jql: ConditionalExpression, options: ICompileOptions): T
export function compile<T extends CompiledExpression>(jql: Expression, options: ICompileOptions): T
export function compile(jql: Expression, options: ICompileOptions): CompiledExpression
export function compile(jql: Expression, options: ICompileOptions): CompiledExpression {
  const CONSTRUCTOR = require(`./expressions/${jql.classname}`)[jql.classname]
  if (!CONSTRUCTOR) throw new SyntaxError(`Unknown expression: classname ${jql.classname} not found`)
  return new CONSTRUCTOR(jql, options)
}
