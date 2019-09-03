import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class FromDaysFunction extends JQLFunction<number> {
  public readonly type = 'Date'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], value: number): number {
    return moment.utc(0).add(value, 'day').toDate().getTime()
  }
}
