import { Type } from 'node-jql'
import { CompiledSql } from '../compiledSql'
import { ICursor } from '../cursor'
import { Sandbox } from '../sandbox'

/**
 * Compiled SQL expression, which should be optimized
 */
export abstract class CompiledExpression extends CompiledSql {
  public readonly aggregateRequired: boolean

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledExpression'
  }

  // @override
  public abstract equals(expression: CompiledExpression): boolean

  /**
   * Evaluate the output of the expression
   * @param cursor [ICursor]
   * @param sandbox [Sandbox]
   */
  public abstract evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: any, type: Type }>
}

/**
 * Compiled SQL conditional expression, which should be optimized
 * i.e. expressions in WHERE clause
 */
export abstract class CompiledConditionalExpression extends CompiledExpression {
  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledConditionalExpression'
  }

  // @override
  public abstract evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: boolean, type: Type }>
}
