import { ILikeExpression } from 'node-jql'
import { Cursor } from '../../cursor'
import { Sandbox } from '../../sandbox'
import { BinaryExpression } from './BinaryExpression'

/**
 * Analyze LikeExpression
 */
export class LikeExpression extends BinaryExpression implements ILikeExpression {
  public readonly classname = LikeExpression.name

  public readonly operator: 'LIKE'|'REGEXP'

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<boolean> {
    const [left, right] = await Promise.all([
      this.left.evaluate(sandbox, cursor),
      this.right.evaluate(sandbox, cursor),
    ])
    let result = false
    if (typeof left === 'string' && typeof right === 'string') {
      result = new RegExp(right).test(left)
      if (!this.$not) result = !result
    }
    return result
  }
}
