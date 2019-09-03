import _ = require('lodash')
import { ParameterExpression } from 'node-jql'
import { JQLAggregateFunction } from '../..'
import { CompiledParameterExpression } from '../../../expr/expressions/ParameterExpression'

export class AnyValueFunction extends JQLAggregateFunction<any> {
  public readonly type = 'any'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of aggregate function ${this.name}(expression)`)
  }

  public run(parameters: CompiledParameterExpression[], ...args: any[]): any {
    return args[0]
  }
}
