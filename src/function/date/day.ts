import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class DayFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly dayType: 'year'|'month'|'week') {
    super(name)
  }

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(expression)`)
    return parameters
  }

  public run(value: any): number {
    switch (this.dayType) {
      case 'year':
        return moment.utc(value).dayOfYear()
      case 'month':
        return moment.utc(value).date()
      case 'week':
        return moment.utc(value).day()
    }
  }
}
