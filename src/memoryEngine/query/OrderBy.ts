import { OrderBy } from 'node-jql'
import { InMemoryDatabaseEngine } from '..'
import { CompiledExpression } from '../expr'
import { compile, ICompileOptions } from '../expr/compile'

/**
 * Analyze ORDER BY statement
 */
export class CompiledOrderBy extends OrderBy {
  public readonly expression: CompiledExpression
  public readonly order: 'ASC'|'DESC'

  /**
   * @param engine [InMemoryDatabaseEngine]
   * @param jql [OrderBy]
   * @param options [ICompileOptions]
   */
  constructor(engine: InMemoryDatabaseEngine, jql: OrderBy, options: ICompileOptions) {
    super(jql)
    this.expression = compile(engine, jql.expression, options)
  }
}
