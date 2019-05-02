import { ResultColumn } from 'node-jql'
import uuid = require('uuid/v4')
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions, IExpressionWithKey } from '../compiledSql'
import { CompiledExpression } from '../expression'
import { CompiledColumnExpression } from '../expression/column'
import { compile } from '../expression/compile'

export class CompiledResultColumn implements IExpressionWithKey {
  public readonly expression: CompiledExpression
  private key_?: string

  constructor(private readonly sql: ResultColumn, options: ICompilingQueryOptions) {
    try {
      this.expression = compile(sql.expression, options)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile ResultColumn', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledResultColumn'
  }

  get $as(): string|undefined {
    return this.sql.$as
  }

  get key(): string {
    if (this.expression instanceof CompiledColumnExpression) return this.expression.key
    if (!this.key_) this.key_ = uuid()
    return this.key_
  }

  public equals(obj: CompiledResultColumn): boolean {
    return this === obj || (
      this.$as === obj.$as &&
      this.key === obj.key &&
      this.expression.equals(obj.expression)
    )
  }
}
