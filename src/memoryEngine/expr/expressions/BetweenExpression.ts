import { BetweenExpression as NodeJQLBetweenExpression, IBetweenExpression } from 'node-jql'
import squel = require('squel')
import { CompiledConditionalExpression, CompiledExpression } from '..'
import { InMemoryDatabaseEngine } from '../..'
import { Cursor } from '../../cursor'
import { Sandbox } from '../../sandbox'
import { compile, ICompileOptions } from '../compile'

/**
 * Analyze BetweenExpression
 */
export class BetweenExpression extends CompiledConditionalExpression implements IBetweenExpression {
  public readonly classname = BetweenExpression.name

  public readonly left: CompiledExpression
  public readonly start: CompiledExpression
  public readonly end: CompiledExpression

  /**
   * @param engine [InMemoryDatabaseEngine]
   * @param jql [NodeJQLBetweenExpression]
   * @param options [ICompileOptions]
   */
  constructor(engine: InMemoryDatabaseEngine, private readonly jql: NodeJQLBetweenExpression, options: ICompileOptions) {
    super()
    this.left = compile(engine, jql.left, options)
    this.start = compile(engine, jql.start, options)
    this.end = compile(engine, jql.end, options)
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
