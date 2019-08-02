import { ExistsExpression, IExistsExpression } from 'node-jql'
import squel = require('squel')
import { CompiledConditionalExpression } from '..'
import { Cursor } from '../../cursor'
import { FixedCursor } from '../../cursor/fixed'
import { ICompileOptions } from '../../interface'
import { CompiledQuery } from '../../query'
import { Sandbox } from '../../sandbox'

/**
 * Analyze ExistsExpression
 */
export class CompiledExistsExpression extends CompiledConditionalExpression implements IExistsExpression {
  public readonly classname = CompiledExistsExpression.name

  public readonly query: CompiledQuery

  /**
   * @param jql [ExistsExpression]
   * @param options [ICompileOptions]
   */
  constructor(private readonly jql: ExistsExpression, options: ICompileOptions) {
    super()
    this.query = new CompiledQuery(jql.query, {
      ...options,
      tables: { ...options.tables },
      tablesOrder: [...options.tablesOrder],
      columns: [],
      aggregateFunctions: [],
    })
  }

  // @override
  get $not(): boolean|undefined {
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
  public toJson(): IExistsExpression {
    return this.jql.toJson()
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<boolean> {
    const { rows } = await sandbox.run(this.query, { subquery: true, exists: true, cursor: new FixedCursor(cursor) })
    let result = rows.length > 0
    if (this.$not) result = !result
    return result
  }
}
