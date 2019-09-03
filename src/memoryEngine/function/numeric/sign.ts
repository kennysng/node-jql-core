import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class SignFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)

  }

  public run(parameters: CompiledParameterExpression[], value: any): number {
    value = +value
    return value > 0 ? 1 : value < 0 ? -1 : 0
  }
}
