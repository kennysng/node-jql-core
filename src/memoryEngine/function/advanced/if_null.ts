import { checkNull, ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class IfNullFunction extends JQLFunction<any> {
  public readonly type = 'any'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(expression, alt_value)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], target: any, altValue: any): any {
    return checkNull(target) ? altValue : target
  }
}
