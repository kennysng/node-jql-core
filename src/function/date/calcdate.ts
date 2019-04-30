import _ = require('lodash')
import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

type unit = 'second'|'minute'|'hour'|'day'|'week'|'month'|'quarter'|'year' // |'minute_second'|'hour_second'|'hour_minute'|'day_second'|'day_minute'|'day_hour'|'year_month'

/**
 * microsecond is not supported in JavaScript
 */
export class CalcDateFunction extends JQLFunction<number> {
  public readonly type = 'Date'
  private unit: unit = 'day'

  constructor(protected readonly name: string, protected readonly calcType: 'add'|'sub') {
    super(name)
  }

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(date, days)`)
    if (parameters[1].prefix && parameters[1].prefix.toLocaleLowerCase() === 'interval') {
      if (!parameters[1].suffix) throw new SyntaxError(`Invalid use of function ${this.name}(date, INTERVAL value unit)`)
      this.unit = parameters[1].suffix.toLocaleLowerCase() as unit
    }
    return parameters
  }

  public run(value: any, count: number): number {
    let mValue = moment.utc(value)
    if (this.calcType === 'add') {
      mValue = mValue.add(count, this.unit)
    }
    else {
      mValue = mValue.subtract(count, this.unit)
    }
    return mValue.toDate().getTime()
  }
}
