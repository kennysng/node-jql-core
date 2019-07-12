import _ = require('lodash')
import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class DateFormatFunction extends JQLFunction<string> {
  public readonly type = 'string'

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(date, format)`)
    return parameters
  }

  public run(value: number, format: string): string {
    return moment.utc(value).format(format)
  }
}
