import { JoinClause, JoinOperator } from 'node-jql'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { CompiledExpression } from '../expression'
import { compile } from '../expression/compile'
import { CompiledJoinedTableOrSubquery, CompiledTableOrSubquery } from './tableOrSubquery'

export class CompiledJoinClause {
  public readonly tableOrSubquery: CompiledTableOrSubquery
  public readonly $on?: CompiledExpression

  constructor(private readonly sql: JoinClause, tableOrSubquery: CompiledJoinedTableOrSubquery, options: ICompilingQueryOptions) {
    try {
      this.tableOrSubquery = new CompiledTableOrSubquery(sql.tableOrSubquery, options)
      if (sql.$on) {
        this.$on = compile(sql.$on, { ...options, tables: [tableOrSubquery, this.tableOrSubquery] })
      }
    }
    catch (e) {
      throw new InstantiateError('Fail to compile JoinClause', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledJoinClause'
  }

  get operator(): JoinOperator {
    return this.sql.operator
  }

  public equals(obj: CompiledJoinClause): boolean {
    if (this === obj) return true
    if (!this.tableOrSubquery.equals(obj.tableOrSubquery)) return false
    if (!this.$on && !obj.$on) return true
    return (this.$on && obj.$on && this.$on.equals(obj.$on)) || false
  }
}
