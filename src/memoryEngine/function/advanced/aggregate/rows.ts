import _ = require('lodash')
import { ColumnExpression, ParameterExpression } from 'node-jql'
import { JQLAggregateFunction } from '../..'

export class RowsFunction extends JQLAggregateFunction<any> {
  public readonly type = 'any'

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length === 0) parameters.push(new ParameterExpression(new ColumnExpression('*')))
    return parameters
  }

  public run(...args: any[]): any {
    return args
  }
}
