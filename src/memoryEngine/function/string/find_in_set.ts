import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

/**
 * Note that this returns 0-based index
 */
export class FindInSetFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(string, string_list)`)

  }

  public run(parameters: CompiledParameterExpression[], target: any, source: string): number {
    const list = source.split(',')
    return list.indexOf(String(target))
  }
}
