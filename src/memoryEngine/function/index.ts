import { ParameterExpression, Type } from 'node-jql'

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
 * Generic JQL Function
 */
export class GenericJQLFunction extends JQLFunction {
  public readonly type: Type

  /**
   * @param name [string]
   * @param type [Type]
   * @param parameters [Array<Type>] optional
   */
  constructor(name: string, public readonly fn: Function, type: Type, public readonly parameters: Type[] = []) {
    super(name)
    this.type = type
  }

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    for (let i = 0, length = this.parameters.length; i < length; i += 1) {
      if (!parameters[i]) throw new SyntaxError(`Insufficient number of arguments for ${this}). Require ${this.parameters.length} but received ${parameters.length}`)
    }
  }

  // @override
  public run(...args: any[]): any {
    return this.fn(...args)
  }

  // @override
  public toString(): string {
    return `${this.name}(${this.parameters.join(', ')})`
  }
}

/**
 * JQL Aggregate Function
 * This can only support exactly 1 arguments
 */
export abstract class JQLAggregateFunction<T = any> extends JQLFunction<T> {
  // @override
  public abstract run(...args: T[]): T
}
