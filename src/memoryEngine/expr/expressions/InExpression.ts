import { BinaryOperator, Expression, IInExpression, InExpression } from 'node-jql'
import { CompiledExpression } from '..'
import { InMemoryError } from '../../../utils/error/InMemoryError'
import { Cursor } from '../../cursor'
import { FixedCursor } from '../../cursor/fixed'
import { ICompileOptions } from '../../interface'
import { CompiledQuery } from '../../query'
import { Sandbox } from '../../sandbox'
import { compile } from '../compile'
import { CompiledBinaryExpression } from './BinaryExpression'

/**
 * Analyze InExpression
 */
export class CompiledInExpression extends CompiledBinaryExpression implements IInExpression {
  public readonly classname = CompiledInExpression.name
  public readonly right: CompiledExpression|CompiledQuery

  /**
   * @param jql [InExpression]
   * @param options [ICompileOptions]
   */
  constructor(jql: InExpression, options: ICompileOptions) {
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
  get operator(): BinaryOperator {
    return 'IN'
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<boolean> {
    let right: any[]
    if (this.right instanceof CompiledQuery) {
      const result = await sandbox.run(this.right, { subquery: true, cursor: new FixedCursor(cursor) })
      const columns = result.columns
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
