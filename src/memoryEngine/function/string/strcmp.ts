import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class StrcmpFunction extends JQLFunction<boolean> {
  public readonly type = 'boolean'

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(string1, string2)`)
    return parameters
  }

  public run(l: any, r: any): boolean {
    return String(l) === String(r)
  }
}
