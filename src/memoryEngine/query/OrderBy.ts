import { OrderBy } from 'node-jql'
import uuid = require('uuid/v4')
import { CompiledExpression } from '../expr'
import { compile, ICompileOptions } from '../expr/compile'
import { ColumnExpression } from '../expr/expressions/ColumnExpression'

/**
 * Analyze ORDER BY statement
 */
export class CompiledOrderBy extends OrderBy {
  /**
   * Column ID
   */
  public readonly id = uuid()
  public readonly expression: CompiledExpression
  public readonly order: 'ASC'|'DESC'

  /**
   * @param jql [OrderBy]
   * @param options [ICompileOptions]
   */
  constructor(jql: OrderBy, options: ICompileOptions) {
    super(jql)
    this.expression = compile(jql.expression, options)
    if (this.expression instanceof ColumnExpression) this.id = this.expression.key
  }
}
