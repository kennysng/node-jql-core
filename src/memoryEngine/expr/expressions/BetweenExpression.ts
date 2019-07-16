import { BetweenExpression, IBetweenExpression } from 'node-jql'
import squel = require('squel')
import { CompiledConditionalExpression, CompiledExpression } from '..'
import { Cursor } from '../../cursor'
import { ICompileOptions } from '../../interface'
import { Sandbox } from '../../sandbox'
import { compile } from '../compile'

/**
 * Analyze BetweenExpression
 */
export class CompiledBetweenExpression extends CompiledConditionalExpression implements IBetweenExpression {
  public readonly classname = CompiledBetweenExpression.name

  public readonly left: CompiledExpression
  public readonly start: CompiledExpression
  public readonly end: CompiledExpression

  /**
   * @param jql [BetweenExpression]
   * @param options [ICompileOptions]
   */
  constructor(private readonly jql: BetweenExpression, options: ICompileOptions) {
    super()
    this.left = compile(jql.left, options)
    this.start = compile(jql.start, options)
    this.end = compile(jql.end, options)
  }

  // @override
  get $not(): boolean {
    return this.jql.$not
  }

  // @override
  public validate(availableTables: string[]): void {
    this.jql.validate(availableTables)
  }

  // @override
  public toSquel(): squel.Expression {
    return this.jql.toSquel()
  }

  // @override
  public toJson(): IBetweenExpression {
    return this.jql.toJson()
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<boolean> {
    const [left, start, end] = await Promise.all([
      this.left.evaluate(sandbox, cursor),
      this.start.evaluate(sandbox, cursor),
      this.end.evaluate(sandbox, cursor),
    ])
    let result = false
    try {
      result = start < left < end
      if (this.$not) result = !result
    }
    catch (e) {
      // do nothing
    }
    return result
  }
}
