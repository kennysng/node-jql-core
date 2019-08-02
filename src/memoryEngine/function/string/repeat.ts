import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class RepeatFunction extends JQLFunction<string> {
  public readonly type = 'string'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(string, number)`)

  }

  public run(value: any, count: number): string {
    return String(value).repeat(count)
  }
}
