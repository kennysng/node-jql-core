import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class ConvFunction extends JQLFunction<string> {
  public readonly type = 'string'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(number, from_base, to_base)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], value: number, fromBase: number, toBase: number): string {
    return parseInt(String(value), fromBase).toString(toBase)
  }
}
