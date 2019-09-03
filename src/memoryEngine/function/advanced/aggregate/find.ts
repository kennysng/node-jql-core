import _ = require('lodash')
import { checkNull, ParameterExpression } from 'node-jql'
import { JQLAggregateFunction } from '../..'
import { CompiledParameterExpression } from '../../../expr/expressions/ParameterExpression'

export class FindFunction extends JQLAggregateFunction<any> {
  public readonly type = 'any'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(condition, expression)`)
  }

  public run(parameters: CompiledParameterExpression[], ...args: Array<[boolean, any]>): any {
    return args.reduce((result, [flag, value]) => checkNull(result) && flag ? value : result, undefined)
  }
}
