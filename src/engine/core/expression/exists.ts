import { ExistsExpression } from 'node-jql'
import { CompiledConditionalExpression } from '.'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { CompiledQuery } from '../query'
import { Sandbox } from '../sandbox'

export class CompiledExistsExpression extends CompiledConditionalExpression {
  public readonly query: CompiledQuery

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
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<boolean> {
    return sandbox.run(this.query, cursor).then(({ data }) => data.length > 0)
  }
}
