import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class NumberFunction extends JQLFunction<number> {
  public readonly type = 'string'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(expression)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], target: any): number {
    try {
      return +target
    }
    catch (e) {
      return NaN
    }
  }
}
