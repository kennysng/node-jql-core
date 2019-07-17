import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class DayNameFunction extends JQLFunction<string> {
  public readonly type = 'string'

  constructor(protected readonly name: string) {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(expression)`)
  }

  public run(value: any): string {
    return moment.utc(value).format('dddd')
  }
}
