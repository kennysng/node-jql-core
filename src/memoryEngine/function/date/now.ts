import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class NowFunction extends JQLFunction<number> {
  public readonly type = 'Date'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length > 0) throw new SyntaxError(`Invalid use of function ${this.name}()`)
  }

  // @override
  public run(): number {
    return Date.now()
  }
}
