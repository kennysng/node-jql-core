import _ = require('lodash')
import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class DiffFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected unit: moment.unitOfTime.DurationConstructor) {
    super(name)
  }

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length < 2 && parameters.length > 4) throw new SyntaxError(`Invalid use of function ${this.name}(value1, value2, value1Format?, value2Format?)`)
  }

  // @override
  public run(l: any, r: any, lFormat?: string, rFormat?: string): number {
    return moment.utc(l, lFormat).diff(moment.utc(r, rFormat), this.unit)
  }
}
