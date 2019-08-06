import { reverse } from 'esrever'
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class ReverseFunction extends JQLFunction<string> {
  public readonly type = 'string'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(string)`)

  }

  public run(parameters: CompiledParameterExpression[], value: any): string {
    return reverse(String(value))
  }
}
