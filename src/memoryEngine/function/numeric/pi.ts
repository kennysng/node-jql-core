import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class PiFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length > 0) throw new SyntaxError(`Invalid use of function ${this.name}()`)
    return parameters
  }

  public run(): number {
    return Math.PI
  }
}
