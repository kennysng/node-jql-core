import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class Atan2Function extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(a, b)`)

  }

  public run(parameters: CompiledParameterExpression[], y: any, x: any): number {
    return Math.atan2(+y, +x)
  }
}
