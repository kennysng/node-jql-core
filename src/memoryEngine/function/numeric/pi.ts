import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class PiFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length > 0) throw new SyntaxError(`Invalid use of function ${this.name}()`)

  }

  public run(): number {
    return Math.PI
  }
}
