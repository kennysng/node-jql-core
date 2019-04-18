import { Order, OrderingTerm } from 'node-jql'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { CompiledExpression } from '../expression'
import { compile } from '../expression/compile'

export class CompiledOrderingTerm {
  public readonly expression: CompiledExpression

  constructor(private readonly sql: OrderingTerm, options: ICompilingQueryOptions) {
    try {
      this.expression = compile(sql.expression, options)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile OrderingTerm', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledOrderingTerm'
  }

  get order(): Order {
    return this.sql.order
  }

  public equals(obj: CompiledOrderingTerm): boolean {
    return this === obj || (
      this.order === obj.order &&
      this.expression.equals(obj.expression)
    )
  }
}
