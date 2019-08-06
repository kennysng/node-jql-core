import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class IfFunction extends JQLFunction<any> {
  public readonly type = 'any'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(condition, value_if_true, value_if_false)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], target: any, trueValue: any, falseValue: any): any {
    return target ? trueValue : falseValue
  }
}
