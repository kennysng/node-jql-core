import { CaseExpression, ICaseExpression } from 'node-jql'
import squel = require('squel')
import { CompiledConditionalExpression, CompiledExpression } from '..'
import { Cursor } from '../../cursor'
import { ICompileOptions } from '../../interface'
import { Sandbox } from '../../sandbox'
import { compile } from '../compile'

/**
 * Analyze CaseExpression
 */
export class CompiledCaseExpression extends CompiledConditionalExpression implements ICaseExpression {
  public readonly classname = CompiledCaseExpression.name
  public readonly type = 'any'

  public readonly cases: Array<{ $when: CompiledConditionalExpression, $then: CompiledExpression }>
  public readonly $else?: CompiledExpression

  /**
   * @param jql [CaseExpression]
   * @param options [ICompileOptions]
   */
  constructor(private readonly jql: CaseExpression, options: ICompileOptions) {
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
        return $then.evaluate(sandbox, cursor)
      }
    }
    return this.$else ? await this.$else.evaluate(sandbox, cursor) : null
  }
}
