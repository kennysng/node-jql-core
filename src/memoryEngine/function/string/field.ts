import _ = require('lodash')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

/**
 * Note that this returns 0-based index
 */
export class FieldFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length < 2) throw new SyntaxError(`Invalid use of function ${this.name}(target, ...values)`)

  }

  public run(parameters: CompiledParameterExpression[], target: any, ...args: any[]): number {
    return args.findIndex(arg => _.isEqual(target, arg))
  }
}
