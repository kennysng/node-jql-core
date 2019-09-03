import _ from 'lodash'
import { checkNull, ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class NullIfFunction extends JQLFunction<any> {
  public readonly type = 'any'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(expr1, expr2)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], value1: any, value2: any): any {
    return _.isEqual(value1, value2) ? null : value1
  }
}
