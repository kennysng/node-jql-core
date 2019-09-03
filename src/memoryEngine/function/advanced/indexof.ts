import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class IndexOfFunction extends JQLFunction<number> {
  public readonly type = 'number'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(expression, list)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], value: any, list: any[]): number {
    const index = list.indexOf(value)
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
}
