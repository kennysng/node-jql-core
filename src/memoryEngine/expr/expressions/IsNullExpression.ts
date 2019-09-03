import { BinaryOperator, checkNull, IIsNullExpression } from 'node-jql'
import { Cursor } from '../../cursor'
import { Sandbox } from '../../sandbox'
import { CompiledBinaryExpression } from './BinaryExpression'

/**
 * Analyze IsNullExpression
 */
export class CompiledIsNullExpression extends CompiledBinaryExpression implements IIsNullExpression {
  public readonly classname = CompiledIsNullExpression.name
  public readonly right = null

  // @override
  get operator(): BinaryOperator {
    return 'IS'
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<boolean> {
    const left = await this.left.evaluate(sandbox, cursor)
    let result = checkNull(left)
    if (this.$not) result = !result
    return result
  }
}
