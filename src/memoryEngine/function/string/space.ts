import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class SpaceFunction extends JQLFunction<string> {
  public readonly type = 'string'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)

  }

  public run(count: number): string {
    return ' '.repeat(count)
  }
}
