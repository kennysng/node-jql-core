import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class ReplaceFunction extends JQLFunction<string> {
  public readonly type = 'string'

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(string, from_string, new_string)`)
    return parameters
  }

  public run(value: any, target: any, replace: any): string {
    return String(value).replace(new RegExp(String(target), 'g'), String(replace))
  }
}
