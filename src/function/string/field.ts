import _ = require('lodash')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

/**
 * Note that this returns 0-based index
 */
export class FieldFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length < 2) throw new SyntaxError(`Invalid use of function ${this.name}(target, ...values)`)
    return parameters
  }

  public run(target: any, ...args: any[]): number {
    return args.findIndex(arg => _.isEqual(target, arg))
  }
}
