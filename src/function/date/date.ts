import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class DateFunction extends JQLFunction<number> {
  public readonly type = 'Date'

  constructor(protected readonly name: string) {
    super(name)
  }

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(expression)`)
    return parameters
  }

  public run(value: any): number {
    return moment.utc(value).startOf('day').toDate().getTime()
  }
}
