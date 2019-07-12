import { CaseExpression as NodeJQLCaseExpression, ICaseExpression } from 'node-jql'
import squel = require('squel')
import { CompiledConditionalExpression, CompiledExpression } from '..'
import { Cursor } from '../../cursor'
import { Sandbox } from '../../sandbox'
import { compile, ICompileOptions } from '../compile'

/**
 * Analyze CaseExpression
 */
export class CaseExpression extends CompiledConditionalExpression implements ICaseExpression {
  public readonly classname = CaseExpression.name
  public readonly type = 'any'

  public readonly cases: Array<{ $when: CompiledConditionalExpression, $then: CompiledExpression }>
  public readonly $else?: CompiledExpression

  /**
   * @param jql [NodeJQLCaseExpression]
   * @param options [ICompileOptions]
   */
  constructor(private readonly jql: NodeJQLCaseExpression, options: ICompileOptions) {
    super()
    this.cases = jql.cases.map(({ $when, $then }) => ({ $when: compile($when, options), $then: compile($then, options) }))
    if (jql.$else) this.$else = compile(jql.$else, options)
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
  public toJson(): ICaseExpression {
    return this.jql.toJson()
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<any> {
    for (const { $when, $then } of this.cases) {
      if (await $when.evaluate(sandbox, cursor)) {
        return await $then.evaluate(sandbox, cursor)
      }
    }
    return this.$else ? await this.$else.evaluate(sandbox, cursor) : null
  }
}
