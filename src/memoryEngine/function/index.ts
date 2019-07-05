import { Type } from 'node-jql'
import { ParameterExpression } from '../expr/expressions/ParameterExpression'

/**
 * JQL Function
 */
export abstract class JQLFunction<T = any> {
  public readonly type: Type

  /**
   * @param name [string]
   */
  constructor(protected readonly name: string) {
  }

  /**
   * Interpret and process the parameters before running the function
   * @param parameters [Array<ParameterExpression>]
   */
  public interpret(parameters: ParameterExpression[]): void {
    // do nothing
  }

  /**
   * Do calculation
   * @param args [Array]
   */
  public abstract run(...args: any[]): T
}

/**
 * JQL Aggregate Function
 * This can only support exactly 1 arguments
 */
export abstract class JQLAggregateFunction<T = any> extends JQLFunction<T> {
  // @override
  public abstract run(...args: T[]): T
}
