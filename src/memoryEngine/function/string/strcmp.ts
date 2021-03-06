import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class StrcmpFunction extends JQLFunction<boolean> {
  public readonly type = 'boolean'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(string1, string2)`)

  }

  public run(parameters: CompiledParameterExpression[], l: any, r: any): boolean {
    return String(l) === String(r)
  }
}
