import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class Atan2Function extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(a, b)`)

  }

  public run(y: any, x: any): number {
    return Math.atan2(+y, +x)
  }
}
