import { OrderBy } from 'node-jql'
import uuid = require('uuid/v4')
import { CompiledExpression } from '../expr'
import { compile } from '../expr/compile'
import { CompiledColumnExpression } from '../expr/expressions/ColumnExpression'
import { ICompileOptions } from '../interface'

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
    if (this.expression instanceof CompiledColumnExpression) this.id = this.expression.key
  }
}
