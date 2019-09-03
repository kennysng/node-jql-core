/* tslint:disable:no-eval */

import { BinaryOperator, IRegexpExpression } from 'node-jql'
import { Cursor } from '../../cursor'
import { Sandbox } from '../../sandbox'
import { CompiledBinaryExpression } from './BinaryExpression'

/**
 * Analyze RegexpExpression
 */
export class CompiledRegexpExpression extends CompiledBinaryExpression implements IRegexpExpression {
  public readonly classname = CompiledRegexpExpression.name

  // @override
  get operator(): BinaryOperator {
    return 'REGEXP'
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<boolean> {
    const [left, right] = await Promise.all([
      this.left.evaluate(sandbox, cursor),
      this.right.evaluate(sandbox, cursor),
    ])
    let result = false
    if (typeof left === 'string') {
      const regexp = typeof right === 'string' && right.length > 2 && right.startsWith('/') && right.indexOf('/', 2) > -1
        ? eval(right) as RegExp
        : new RegExp(right)
      result = regexp.test(left)
      if (!this.$not) result = !result
    }
    return result
  }
}
