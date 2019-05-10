import { reverse } from 'esrever'
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class ReverseFunction extends JQLFunction<string> {
  public readonly type = 'string'

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(string)`)
    return parameters
  }

  public run(value: any): string {
    return reverse(String(value))
  }
}