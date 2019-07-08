import { GroupBy } from 'node-jql'
import uuid = require('uuid/v4')
import { InMemoryDatabaseEngine } from '..'
import { CompiledConditionalExpression, CompiledExpression } from '../expr'
import { compile, ICompileOptions } from '../expr/compile'

/**
 * Analyze GROUP BY statement
 */
export class CompiledGroupBy extends GroupBy {
  public readonly id: string[]
  public readonly expressions: CompiledExpression[]
  public readonly $having?: CompiledConditionalExpression

  /**
   * @param engine [InMemoryDatabaseEngine]
   * @param jql [GroupBy]
   * @param options [ICompileOptions]
   */
  constructor(engine: InMemoryDatabaseEngine, jql: GroupBy, options: ICompileOptions) {
    super(jql)
    this.id = jql.expressions.map(() => uuid())
    this.expressions = jql.expressions.map(jql => compile(engine, jql, options))
    if (jql.$having) this.$having = compile(engine, jql.$having, options)
  }
}
