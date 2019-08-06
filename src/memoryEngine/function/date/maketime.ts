import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class MakeTimeFunction extends JQLFunction<number> {
  public readonly type = 'Date'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(hour, minute, second)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], hour: number, minute: number, second: number): number {
    return moment.utc(0).hour(hour).minute(minute).second(second).startOf('second').toDate().getTime()
  }
}
