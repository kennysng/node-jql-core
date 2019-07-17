import _ = require('lodash')
import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class DiffFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected unit: moment.unitOfTime.DurationConstructor) {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(value1, value2)`)

  }

  public run(l: any, r: any): number {
    return moment.utc(l).diff(moment.utc(r), this.unit)
  }
}
