import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class CalcTimeFunction extends JQLFunction<number> {
  public readonly type = 'Date'

  constructor(protected readonly name: string, protected readonly calcType: 'add'|'sub') {
    super(name)
  }

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2 && parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(datetime, addtime, format?)`)
  }

  // @override
  public run(value: any, seconds: number, format?: string): number {
    return moment.utc(value, format).add(seconds, 'second').toDate().getTime()
  }
}
