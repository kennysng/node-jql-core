import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class SqrtFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)
    return parameters
  }

  public run(value: any): number {
    return Math.sqrt(value)
  }
}
