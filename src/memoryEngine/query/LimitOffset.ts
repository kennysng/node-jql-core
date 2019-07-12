import { LimitOffset } from 'node-jql'
import { InMemoryDatabaseEngine } from '..'
import { CompiledExpression } from '../expr'
import { compile, ICompileOptions } from '../expr/compile'

/**
 * Analyze LIMIT statement
 */
export class CompiledLimitOffset extends LimitOffset {
  public readonly $limit: CompiledExpression
  public readonly $offset?: CompiledExpression

  /**
   * @param engine [InMemoryDatabaseEngine]
   * @param jql [LimitOffset]
   * @param options [ICompileOptions]
   */
  constructor(engine: InMemoryDatabaseEngine, jql: LimitOffset, options: ICompileOptions) {
    super(jql)
    this.$limit = compile(engine, jql.$limit, options)
    if (jql.$offset) this.$offset = compile(engine, jql.$offset, options)
  }
}
