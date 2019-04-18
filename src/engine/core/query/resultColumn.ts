import { ResultColumn } from 'node-jql'
import uuid = require('uuid/v4')
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { CompiledExpression } from '../expression'
import { CompiledColumnExpression } from '../expression/column'
import { compile } from '../expression/compile'

export class CompiledResultColumn {
  public readonly expression: CompiledExpression

  private generatedKey = uuid()

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
    return this.expression instanceof CompiledColumnExpression ? this.expression.columnKey : this.generatedKey
  }

  public equals(obj: CompiledResultColumn): boolean {
    return this === obj || (
      this.$as === obj.$as &&
      this.key === obj.key &&
      this.expression.equals(obj.expression)
    )
  }
}
