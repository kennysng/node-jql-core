import { AxiosInstance } from 'axios'
import { ConditionalExpression, Expression } from 'node-jql'
import { CompiledConditionalExpression, CompiledExpression } from '.'
import { InMemoryDatabaseEngine } from '..'
import { Table } from '../table'
import { ColumnExpression } from './expressions/ColumnExpression'
import { FunctionExpression } from './expressions/FunctionExpression'

/**
 * Options required for compilation
 */
export interface ICompileOptions {
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
}

/**
 * Compile expressions
 * @param jql [Expression]
 */
export function compile<T extends CompiledConditionalExpression>(engine: InMemoryDatabaseEngine, jql: ConditionalExpression, options: ICompileOptions): T
export function compile<T extends CompiledExpression>(engine: InMemoryDatabaseEngine, jql: Expression, options: ICompileOptions): T
export function compile(engine: InMemoryDatabaseEngine, jql: Expression, options: ICompileOptions): CompiledExpression
export function compile(engine: InMemoryDatabaseEngine, jql: Expression, options: ICompileOptions): CompiledExpression {
  const CONSTRUCTOR = require(`./expressions/${jql.classname}`)[jql.classname]
  if (!CONSTRUCTOR) throw new SyntaxError(`Unknown expression: classname ${jql.classname} not found`)
  return new CONSTRUCTOR(engine, jql, options)
}
