import { CancelableAxiosPromise, CancelablePromise, CreatePromiseFn } from '@kennysng/c-promise'
import { AxiosResponse } from 'axios'
import { FromTable, JoinClause, JoinOperator, Query, Type } from 'node-jql'
import { CompiledQuery } from '.'
import { NoDatabaseError } from '../../utils/error/NoDatabaseError'
import { CompiledConditionalExpression } from '../expr'
import { compile } from '../expr/compile'
import { ICompileOptions } from '../interface'
import { MemoryColumn, MemoryTable } from '../table'

export class CompiledJoinClause extends JoinClause {
  public readonly operator: JoinOperator
  public readonly table: CompiledFromTable
  public readonly $on?: CompiledConditionalExpression

  /**
   * @param jql [FromTable]
   * @param options [ICompileOptions]
   */
  constructor(jql: JoinClause, options: ICompileOptions) {
    super(jql)
    this.table = new CompiledFromTable(jql.table, options)
    if (jql.$on) this.$on = compile(jql.$on, options)
  }
}

/**
 * Analyze tables
 */
export class CompiledFromTable extends FromTable {
  public readonly database?: string
  public readonly table: MemoryTable
  public readonly query?: CompiledQuery
  public readonly remote?: CreatePromiseFn<AxiosResponse<any[]>>
  public readonly $as?: string
  public readonly joinClauses: CompiledJoinClause[]

  /**
   * @param jql [FromTable]
   * @param options [ICompileOptions]
   */
  constructor(jql: FromTable, options: ICompileOptions) {
    super(jql)

    if (typeof jql.table === 'string') {
      const database = jql.database || options.defDatabase
      if (!database) throw new NoDatabaseError()
      this.table = options.getTable(database, jql.table)
      options.tables[jql.$as || jql.table] = this.table
      options.ownTables.push(jql.$as || jql.table)
      options.tablesOrder.push(jql.$as || jql.table)
    }
    else if (jql.table instanceof Query) {
      this.query = new CompiledQuery(jql.table, { ...options,
        $as: jql.$as,
        tables: { ...options.tables },
        tablesOrder: [...options.tablesOrder],
        columns: [],
        aggregateFunctions: [],
      })
      this.table = this.query.table
      options.tables[jql.$as as string] = this.table
      options.ownTables.push(jql.$as as string)
      options.tablesOrder.push(jql.$as as string)
    }
    else {
      const axiosConfig = jql.table
      this.remote = () => new CancelablePromise(() => new CancelableAxiosPromise<any[]>(axiosConfig, options.axiosInstance), async (fn, resolve) => {
        const response = await fn()
        response.data = response.data.map(row => {
          const result: any = {}
          for (const { name, $as } of axiosConfig.columns) result[$as || name] = row[name]
          return result
        })
        return resolve(response)
      })
      this.table = new MemoryTable(jql.$as as string, jql.table.columns.map(({ name, type, $as }) => new MemoryColumn<Type>($as || name, type || 'any')))
      options.tables[jql.$as as string] = this.table
      options.ownTables.push(jql.$as as string)
      options.tablesOrder.push(jql.$as as string)
    }

    this.joinClauses = jql.joinClauses.map(jql => new CompiledJoinClause(jql, options))
  }
}
