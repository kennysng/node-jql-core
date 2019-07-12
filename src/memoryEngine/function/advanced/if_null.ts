import { checkNull, ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class IfNullFunction extends JQLFunction<number> {
  public readonly type = 'any'

  // @override
  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(expression, alt_value)`)
    return parameters
  }

  public run(target: any, altValue: any): any {
    return checkNull(target) ? altValue : target
  }
}
