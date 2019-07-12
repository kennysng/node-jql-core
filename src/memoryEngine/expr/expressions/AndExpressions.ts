import { AndExpressions as NodeJQLAndExpressions, IGroupedExpressions } from 'node-jql'
import squel from 'squel'
import { CompiledConditionalExpression, CompiledExpression } from '..'
import { InMemoryDatabaseEngine } from '../..'
import { Cursor } from '../../cursor'
import { Sandbox } from '../../sandbox'
import { compile, ICompileOptions } from '../compile'

/**
 * Analyze AndExpressions
 */
export class AndExpressions extends CompiledConditionalExpression implements IGroupedExpressions {
  public readonly classname = AndExpressions.name

  public readonly expressions: CompiledExpression[]

  /**
   * @param engine [InMemoryDatabaseEngine]
   * @param jql [NodeJQLAndExpressions]
   * @param options [ICompileOptions]
   */
  constructor(engine: InMemoryDatabaseEngine, private readonly jql: NodeJQLAndExpressions, options: ICompileOptions) {
    super()
    this.expressions = jql.expressions.map(jql => compile(engine, jql, options))
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
  public toJson(): IGroupedExpressions {
    return this.jql.toJson()
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<boolean> {
    for (const expression of this.expressions) {
      if (!await expression.evaluate(sandbox, cursor)) return false
    }
    return true
  }
}
