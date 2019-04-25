import { ColumnExpression, Expression } from 'node-jql'
import { JQLAggregateFunction } from '..'
import { isUndefined } from '../../utils/isUndefined'

export class CountFunction extends JQLAggregateFunction<number> {
  public readonly type = 'number'
  public $distinct: boolean = false

  public preprocess(extra: string, parameters: Expression[]): Expression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function 'COUNT(expression)'`)
    if (extra.toLocaleLowerCase() === 'distinct') this.$distinct = true
    const expression = parameters[0]
    return expression instanceof ColumnExpression && expression.isWildcard ? [] : parameters
  }

  public run(...args: number[]): number {
    return args.reduce((result, arg) => !isUndefined(arg) ? result + 1 : result, 0)
  }
}
