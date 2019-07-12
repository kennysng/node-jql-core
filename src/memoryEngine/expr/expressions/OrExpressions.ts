import { IGroupedExpressions, OrExpressions as NodeJQLOrExpressions } from 'node-jql'
import squel from 'squel'
import { CompiledConditionalExpression, CompiledExpression } from '..'
import { Cursor } from '../../cursor'
import { Sandbox } from '../../sandbox'
import { compile, ICompileOptions } from '../compile'

/**
 * Analyze OrExpressions
 */
export class OrExpressions extends CompiledConditionalExpression implements IGroupedExpressions {
  public readonly classname = OrExpressions.name

  public readonly expressions: CompiledExpression[]

  /**
   * @param jql [NodeJQLOrExpressions]
   * @param options [ICompileOptions]
   */
  constructor(private readonly jql: NodeJQLOrExpressions, options: ICompileOptions) {
    super()
    this.expressions = jql.expressions.map(jql => compile(jql, options))
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
      if (await expression.evaluate(sandbox, cursor)) return true
    }
    return false
  }
}
