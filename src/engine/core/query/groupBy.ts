import { GroupBy } from 'node-jql'
import uuid = require('uuid/v4')
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions, IExpressionWithKey } from '../compiledSql'
import { CompiledConditionalExpression } from '../expression'
import { compile } from '../expression/compile'
import { CompiledResultColumn } from './resultColumn'

export class CompiledGroupBy {
  public readonly expressions: IExpressionWithKey[]
  public readonly $having?: CompiledConditionalExpression

  constructor(private readonly sql: GroupBy, $select: CompiledResultColumn[], options: ICompilingQueryOptions) {
    try {
      this.expressions = sql.expressions.map(expression => {
        const compiled = compile(expression, options)
        const column = $select.find(({ expression: e }) => compiled.equals(e))
        const key = column ? column.key : uuid()
        return { expression: compiled, key }
      })
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
    for (const { expression, key } of this.expressions) {
      if (!obj.expressions.find(({ expression: e, key: k }) => expression.equals(e) && key === k)) return false
    }
    if (!this.$having && !obj.$having) return true
    return (this.$having && obj.$having && this.$having.equals(obj.$having)) || false
  }
}
