import { ParameterExpression, Type } from 'node-jql'
import { CompiledParameterExpression } from '../expr/expressions/ParameterExpression'

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
   * @param parameters [Array<CompiledParameterExpression>]
   * @param args [Array]
   */
  public abstract run(parameters: CompiledParameterExpression[], ...args: any[]): T
}

/**
 * Generic JQL Function
 */
export class GenericJQLFunction extends JQLFunction {
  public readonly aggregate: boolean
  public readonly fn: Function
  public readonly type: Type
  public readonly parameters: Type[] = []

  /**
   * @param aggregate [boolean]
   * @param name [string]
   * @param type [Type]
   * @param parameters [Array<Type>] optional
   */
  constructor(aggregate: true, name: string, fn: Function, type: Type, parameters: Type[])

  /**
   * @param name [string]
   * @param type [Type]
   * @param parameters [Array<Type>] optional
   */
  constructor(name: string, fn: Function, type: Type, parameters: Type[])

  constructor(...args: any[]) {
    super(typeof args[0] === 'boolean' ? args[1] : args[0])

    // parse args
    let aggregate = false, fn: Function, type: Type, parameters: Type[] = []
    if (typeof args[0] === 'boolean') {
      aggregate = args[0]
      fn = args[2]
      type = args[3]
      parameters = args[4]
    }
    else {
      fn = args[1]
      type = args[2]
      parameters = args[3]
    }

    // set args
    this.aggregate = aggregate
    this.fn = fn
    this.type = type
    this.parameters = parameters
  }

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    for (let i = 0, length = this.parameters.length; i < length; i += 1) {
      if (!parameters[i]) throw new SyntaxError(`Insufficient number of arguments for ${this}). Require ${this.parameters.length} but received ${parameters.length}`)
    }
  }

  // @override
  public run(parameters: CompiledParameterExpression[], ...args: any[]): any {
    return this.fn(parameters, ...args)
  }

  // @override
  public toString(): string {
    return `${this.name}(${this.parameters.join(', ')})`
  }
}

/**
 * JQL Aggregate Function
 */
export abstract class JQLAggregateFunction<T = any> extends JQLFunction<T> {
  // @override
  public abstract run(parameters: CompiledParameterExpression[], ...args: T[]): T
}
