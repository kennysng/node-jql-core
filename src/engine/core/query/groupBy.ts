import { GroupBy } from 'node-jql'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { CompiledExpression } from '../expression'
import { compile } from '../expression/compile'

export class CompiledGroupBy {
  public readonly expressions: CompiledExpression[]
  public readonly $having?: CompiledExpression

  constructor(private readonly sql: GroupBy, options: ICompilingQueryOptions) {
    try {
      this.expressions = sql.expressions.map(expression => compile(expression, options))
      if (sql.$having) this.$having = compile(sql.$having, options)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile GroupBy', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledGroupBy'
  }

  public equals(obj: CompiledGroupBy): boolean {
    if (this === obj) return true
    if (this.expressions.length !== obj.expressions.length) return false
    for (const expression of this.expressions) {
      if (!obj.expressions.find(e => expression.equals(e))) return false
    }
    if (!this.$having && !obj.$having) return true
    return (this.$having && obj.$having && this.$having.equals(obj.$having)) || false
  }
}
