import _ = require('lodash')
import { ColumnExpression, ParameterExpression } from 'node-jql'
import { JQLAggregateFunction } from '../..'
import { CompiledParameterExpression } from '../../../expr/expressions/ParameterExpression'

export class RowsFunction extends JQLAggregateFunction<any> {
  public readonly type = 'any'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length === 0) parameters.push(new ParameterExpression(null, new ColumnExpression('*')))
  }

  public run(parameters: CompiledParameterExpression[], ...args: any[]): any {
    return args.map<any>((arg: any[]) => parameters.reduce<any>((result, { expression }, i) => {
      const key = expression instanceof ColumnExpression ? expression.name : expression.toString()
      result[key] = arg[i]
      return result
    }, {}))
  }
}
