import { checkNull, IIsNullExpression } from 'node-jql'
import { Cursor } from '../../cursor'
import { Sandbox } from '../../sandbox'
import { BinaryExpression } from './BinaryExpression'

/**
 * Analyze IsNullExpression
 */
export class IsNullExpression extends BinaryExpression implements IIsNullExpression {
  public readonly classname = IsNullExpression.name

  public readonly operator = 'IS'
  public readonly right = null

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<boolean> {
    const left = await this.left.evaluate(sandbox, cursor)
    let result = checkNull(left)
    if (this.$not) result = !result
    return result
  }
}
