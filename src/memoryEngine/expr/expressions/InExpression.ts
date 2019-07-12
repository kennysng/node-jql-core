import { Expression, IInExpression, InExpression as NodeJQLInExpression } from 'node-jql'
import { CompiledExpression } from '..'
import { InMemoryError } from '../../../utils/error/InMemoryError'
import { Cursor } from '../../cursor'
import { FixedCursor } from '../../cursor/fixed'
import { CompiledQuery } from '../../query'
import { Sandbox } from '../../sandbox'
import { Column } from '../../table'
import { compile, ICompileOptions } from '../compile'
import { BinaryExpression } from './BinaryExpression'

/**
 * Analyze InExpression
 */
export class InExpression extends BinaryExpression implements IInExpression {
  public readonly classname = InExpression.name

  public readonly operator: 'IN'
  public readonly right: CompiledExpression|CompiledQuery

  /**
   * @param jql [NodeJQLInExpression]
   * @param options [ICompileOptions]
   */
  constructor(jql: NodeJQLInExpression, options: ICompileOptions) {
    super(jql, options)
    if (jql.right instanceof Expression) {
      this.right = compile(jql.right, options)
    }
    else {
      this.right = new CompiledQuery(jql.right, {
        ...options,
        tables: { ...options.tables },
        tablesOrder: [...options.tablesOrder],
        columns: [],
        aggregateFunctions: [],
      })
      if (this.right.table.columns.length !== 1) throw new InMemoryError('[FATAL] Result of subquery for InExpression does not have exactly 1 column')
    }
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<boolean> {
    let right: any[]
    if (this.right instanceof CompiledQuery) {
      const result = await sandbox.run(this.right, { subquery: true, cursor: new FixedCursor(cursor) })
      const columns = result.columns as Column[]
      if (columns.length !== 1) throw new InMemoryError('[FATAL] Result of subquery for InExpression does not have exactly 1 column')
      right = result.rows.map(row => row[columns[0].id])
    }
    else {
      right = await this.right.evaluate(sandbox, cursor)
    }
    const left = await this.left.evaluate(sandbox, cursor)
    let result = right.indexOf(left) > -1
    if (this.$not) result = !result
    return result
  }
}
