import { Expression, Type } from 'node-jql'

export abstract class JQLFunction<T = any> {
  public readonly type: Type

  public preprocess(extra: string, parameters: Expression[]): Expression[] {
    return parameters
  }

  public abstract run(...args: any[]): T
}

export abstract class JQLAggregateFunction<T = any> extends JQLFunction<T> {
  // @override
  public abstract run(...args: T[]): T
}
