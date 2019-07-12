import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class SignFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)
    return parameters
  }

  public run(value: any): number {
    value = +value
    return value > 0 ? 1 : value < 0 ? -1 : 0
  }
}
