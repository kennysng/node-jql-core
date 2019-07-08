import { OrderBy } from 'node-jql'
import uuid = require('uuid/v4')
import { InMemoryDatabaseEngine } from '..'
import { CompiledExpression } from '../expr'
import { compile, ICompileOptions } from '../expr/compile'

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
   * @param engine [InMemoryDatabaseEngine]
   * @param jql [OrderBy]
   * @param options [ICompileOptions]
   */
  constructor(engine: InMemoryDatabaseEngine, jql: OrderBy, options: ICompileOptions) {
    super(jql)
    this.expression = compile(engine, jql.expression, options)
  }
}
