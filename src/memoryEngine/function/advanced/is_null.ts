import { checkNull, ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class IsNullFunction extends JQLFunction<boolean> {
  public readonly type = 'boolean'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(expression)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], target: any): boolean {
    return checkNull(target)
  }
}
