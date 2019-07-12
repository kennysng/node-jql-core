import { LimitOffset } from 'node-jql'
import { CompiledExpression } from '../expr'
import { compile, ICompileOptions } from '../expr/compile'

/**
 * Analyze LIMIT statement
 */
export class CompiledLimitOffset extends LimitOffset {
  public readonly $limit: CompiledExpression
  public readonly $offset?: CompiledExpression

  /**
   * @param jql [LimitOffset]
   * @param options [ICompileOptions]
   */
  constructor(jql: LimitOffset, options: ICompileOptions) {
    super(jql)
    this.$limit = compile(jql.$limit, options)
    if (jql.$offset) this.$offset = compile(jql.$offset, options)
  }
}
