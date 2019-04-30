import { ExistsExpression, Type } from 'node-jql'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { CompiledConditionalExpression } from '../expression'
import { CompiledQuery } from '../query'
import { Sandbox } from '../sandbox'

export class CompiledExistsExpression extends CompiledConditionalExpression {
  public readonly query: CompiledQuery
  public readonly aggregateRequired = false

  constructor(private readonly expression: ExistsExpression, options: ICompilingQueryOptions) {
    super(expression)
    try {
      this.query = new CompiledQuery(expression.query, options)
      options.unknowns.push(...this.query.unknowns)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile ExistsExpression', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledExistsExpression'
  }

  get $not(): boolean {
    return this.expression.$not || false
  }

  // @override
  public equals(obj: CompiledExistsExpression): boolean {
    return this === obj || (
      this.$not === obj.$not &&
      this.query.equals(obj.query)
    )
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: boolean, type: Type }> {
    return sandbox.run(this.query, { cursor, exists: true })
      .then(({ data }) => ({ value: data.length > 0, type: 'boolean' }))
  }
}
