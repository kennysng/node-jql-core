import { Expression } from 'node-jql'
import { JQLAggregateFunction } from '..'

export class SumFunction extends JQLAggregateFunction<number> {
  public readonly type = 'number'

  public preprocess(extra: string, parameters: Expression[]): Expression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function 'SUM(expression)'`)
    return parameters
  }

  public run(...args: number[]): number {
    return args.reduce((result, arg) => {
      arg = +arg
      if (isNaN(arg)) arg = 0
      return result + arg
    }, 0)
  }
}
