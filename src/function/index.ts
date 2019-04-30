import { ParameterExpression, Type } from 'node-jql'

export abstract class JQLFunction<T = any> {
  public readonly type: Type

  constructor(protected readonly name: string) {
  }

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    return parameters
  }

  public abstract run(...args: any[]): T
}

/**
 * Aggregate function in node-jql only supports 1 and only 1 argument
 */
export abstract class JQLAggregateFunction<T = any> extends JQLFunction<T> {
  // @override
  public abstract run(...args: T[]): T
}
