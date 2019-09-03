import { OrderBy } from 'node-jql'
import uuid = require('uuid/v4')
import { CompiledExpression } from '../expr'
import { compile } from '../expr/compile'
import { CompiledColumnExpression } from '../expr/expressions/ColumnExpression'
import { ICompileOptions } from '../interface'
import { MemoryTable } from '../table'

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
   * @param table [MemoryTable]
   * @param options [ICompileOptions]
   */
  constructor(jql: OrderBy, table: MemoryTable, options: ICompileOptions) {
    super(jql)
    this.expression = compile(jql.expression, { ...options, tables: { ...options.tables, [table.name]: table } })
    if (this.expression instanceof CompiledColumnExpression) this.id = this.expression.key
  }
}
