import { ResultColumn } from 'node-jql'
import uuid = require('uuid/v4')
import { InMemoryDatabaseEngine } from '..'
import { CompiledExpression } from '../expr'
import { compile, ICompileOptions } from '../expr/compile'

/**
 * Analyze result columns
 */
export class CompiledResultColumn extends ResultColumn {
  /**
   * Column ID
   */
  public readonly id = uuid()
  public readonly expression: CompiledExpression
  public readonly $as?: string

  /**
   * @param engine [InMemoryDatabaseEngine]
   * @param jql [ResultColumn]
   * @param options [ICompileOptions]
   */
  constructor(engine: InMemoryDatabaseEngine, jql: ResultColumn, options: ICompileOptions) {
    super(jql)
    this.expression = compile(engine, jql.expression, options)
  }
}
