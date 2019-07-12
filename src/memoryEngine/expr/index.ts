import { ConditionalExpression, Expression, Type } from 'node-jql'
import { Cursor } from '../cursor'
import { Sandbox } from '../sandbox'

/**
 * Analyze expressions
 */
export abstract class CompiledExpression extends Expression {
  /**
   * Result type
   */
  public readonly type: Type

  /**
   * Evaluate the expression
   */
  public abstract async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<any>
}

/**
 * Analyze conditional expressions
 */
export abstract class CompiledConditionalExpression extends ConditionalExpression {
  public readonly type: Type = 'boolean'

  // @override
  public abstract async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<boolean>
}
