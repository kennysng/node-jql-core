import { checkNull, ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class CoalesceFunction extends JQLFunction<any> {
  public readonly type = 'any'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length === 0) throw new SyntaxError(`Invalid use of function ${this.name}(...values)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], ...values: any[]): any {
    for (const value of values) {
      if (!checkNull(value)) return value
    }
    return null
  }
}
