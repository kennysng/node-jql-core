import { Order, OrderingTerm } from 'node-jql'
import uuid = require('uuid/v4')
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions, IExpressionWithKey } from '../compiledSql'
import { CompiledExpression } from '../expression'
import { compile } from '../expression/compile'
import { CompiledResultColumn } from './resultColumn'

export class CompiledOrderingTerm implements IExpressionWithKey {
  public readonly expression: CompiledExpression
  public readonly key: string

  constructor(private readonly sql: OrderingTerm, $select: CompiledResultColumn[], options: ICompilingQueryOptions) {
    try {
      const compiled = this.expression = compile(sql.expression, options)
      const column = $select.find(({ expression: e }) => compiled.equals(e))
      this.key = column ? column.key : uuid()
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
      this.key === obj.key &&
      this.expression.equals(obj.expression)
    )
  }
}
