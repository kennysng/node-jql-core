import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

/**
 * Note that this returns 0-based index
 */
export class FindInSetFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(string, string_list)`)
    return parameters
  }

  public run(target: any, source: string): number {
    const list = source.split(',')
    return list.indexOf(String(target))
  }
}
