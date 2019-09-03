import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class DateFunction extends JQLFunction<number> {
  public readonly type = 'Date'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1 && parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(expression, format?)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], value: any, format?: string): number {
    return moment.utc(value, format).startOf('day').toDate().getTime()
  }
}
