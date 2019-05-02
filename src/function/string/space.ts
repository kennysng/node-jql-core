import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class SpaceFunction extends JQLFunction<string> {
  public readonly type = 'string'

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)
    return parameters
  }

  public run(count: number): string {
    return ' '.repeat(count)
  }
}
