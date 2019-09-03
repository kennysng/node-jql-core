import { ResultColumn } from 'node-jql'
import uuid = require('uuid/v4')
import { CompiledExpression } from '../expr'
import { compile } from '../expr/compile'
import { CompiledFunctionExpression } from '../expr/expressions/FunctionExpression'
import { ICompileOptions } from '../interface'

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
   * @param jql [ResultColumn]
   * @param options [ICompileOptions]
   */
  constructor(jql: ResultColumn, options: ICompileOptions) {
    super(jql)
    this.expression = compile(jql.expression, options)
    if (this.expression instanceof CompiledFunctionExpression) this.id = this.expression.id
  }
}
