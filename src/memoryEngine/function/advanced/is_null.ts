import { checkNull, ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class IsNullFunction extends JQLFunction<boolean> {
  public readonly type = 'boolean'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(expression)`)
  }

  // @override
  public run(target: any): boolean {
    return checkNull(target)
  }
}
