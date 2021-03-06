import { GroupBy } from 'node-jql'
import uuid = require('uuid/v4')
import { CompiledConditionalExpression, CompiledExpression } from '../expr'
import { compile } from '../expr/compile'
import { CompiledColumnExpression } from '../expr/expressions/ColumnExpression'
import { ICompileOptions } from '../interface'

/**
 * Analyze GROUP BY statement
 */
export class CompiledGroupBy extends GroupBy {
  public readonly id: string[]
  public readonly expressions: CompiledExpression[]
  public readonly $having?: CompiledConditionalExpression

  /**
   * @param jql [GroupBy]
   * @param options [ICompileOptions]
   */
  constructor(jql: GroupBy, options: ICompileOptions) {
    super(jql)
    this.id = jql.expressions.map(() => uuid())
    this.expressions = jql.expressions.map(jql => compile(jql, options))
    if (jql.$having) this.$having = compile(jql.$having, options)

    for (let i = 0, length = this.expressions.length; i < length; i += 1) {
      const expression = this.expressions[i]
      if (expression instanceof CompiledColumnExpression) this.id[i] = expression.key
    }
  }
}
