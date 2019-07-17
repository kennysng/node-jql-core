import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class AbsFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)

  }

  public run(value: any): number {
    return Math.abs(+value)
  }
}
