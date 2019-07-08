import { ExistsExpression as NodeJQLExistsExpression, IExistsExpression } from 'node-jql'
import squel = require('squel')
import { CompiledConditionalExpression } from '..'
import { InMemoryDatabaseEngine } from '../..'
import { Cursor } from '../../cursor'
import { CompiledQuery } from '../../query'
import { Sandbox } from '../../sandbox'
import { ICompileOptions } from '../compile'

/**
 * Analyze ExistsExpression
 */
export class ExistsExpression extends CompiledConditionalExpression implements IExistsExpression {
  public readonly classname = ExistsExpression.name

  public readonly query: CompiledQuery

  /**
   * @param engine [InMemoryDatabaseEngine]
   * @param jql [NodeJQLExistsExpression]
   * @param options [ICompileOptions]
   */
  constructor(engine: InMemoryDatabaseEngine, private readonly jql: NodeJQLExistsExpression, options: ICompileOptions) {
    super()
    this.query = new CompiledQuery(engine, jql.query, options)
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
    const { rows } = await sandbox.run(this.query, { exists: true, cursor })
    let result = rows.length > 0
    if (this.$not) result = !result
    return result
  }
}
