import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class MakeDateFunction extends JQLFunction<number> {
  public readonly type = 'Date'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(year, day)`)
  }

  // @override
  public run(year: number, day: number): number {
    return moment.utc().year(year).dayOfYear(day).startOf('day').toDate().getTime()
  }
}
