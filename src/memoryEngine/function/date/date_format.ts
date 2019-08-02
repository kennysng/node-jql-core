import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class DateFormatFunction extends JQLFunction<string> {
  public readonly type = 'string'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2 && parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(date, toFormat, fromFormat?)`)
  }

  // @override
  public run(value: number, toFormat: string, fromFormat?: string): string {
    return moment.utc(value, fromFormat).format(toFormat)
  }
}
