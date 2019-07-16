import { ConditionalExpression, Expression } from 'node-jql'
import { CompiledConditionalExpression, CompiledExpression } from '.'
import { ICompileOptions } from '../interface'
import { expressions } from './expressions'

/**
 * Compile expressions
 * @param jql [Expression]
 */
export function compile<T extends CompiledConditionalExpression>(jql: ConditionalExpression, options: ICompileOptions): T
export function compile<T extends CompiledExpression>(jql: Expression, options: ICompileOptions): T
export function compile(jql: Expression, options: ICompileOptions): CompiledExpression
export function compile(jql: Expression, options: ICompileOptions): CompiledExpression {
  const CONSTRUCTOR = expressions[jql.classname]
  if (!CONSTRUCTOR) throw new SyntaxError(`Unknown expression: classname ${jql.classname} not found`)
  return new CONSTRUCTOR(jql, options)
}
