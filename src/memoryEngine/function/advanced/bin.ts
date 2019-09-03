import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class BinFunction extends JQLFunction<string> {
  public readonly type = 'string'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], value: number): string {
    return typeof value === 'number' ? value.toString(2) : '0'
  }
}
