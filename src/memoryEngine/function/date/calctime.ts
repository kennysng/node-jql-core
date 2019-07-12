import _ = require('lodash')
import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class CalcTimeFunction extends JQLFunction<number> {
  public readonly type = 'Date'

  constructor(protected readonly name: string, protected readonly calcType: 'add'|'sub') {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(datetime, addtime)`)
    return parameters
  }

  public run(value: any, seconds: number): number {
    return moment.utc(value).add(seconds, 'second').toDate().getTime()
  }
}
