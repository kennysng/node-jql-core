import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class ReplaceFunction extends JQLFunction<string> {
  public readonly type = 'string'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(string, from_string, new_string)`)

  }

  public run(parameters: CompiledParameterExpression[], value: any, target: any, replace: any): string {
    return String(value).replace(new RegExp(String(target), 'g'), String(replace))
  }
}
