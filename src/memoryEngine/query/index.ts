import _ from 'lodash'
import { ColumnExpression as NodeJQLColumnExpression, Query, ResultColumn } from 'node-jql'
import uuid = require('uuid/v4')
import { InMemoryDatabaseEngine } from '..'
import { CompiledConditionalExpression } from '../expr'
import { compile, ICompileOptions } from '../expr/compile'
import { ColumnExpression } from '../expr/expressions/ColumnExpression'
import { Column, Table } from '../table'
import { CompiledFromTable } from './FromTable'
import { CompiledGroupBy } from './GroupBy'
import { CompiledLimitOffset } from './LimitOffset'
import { CompiledOrderBy } from './OrderBy'
import { CompiledResultColumn } from './ResultColumn'

/**
 * Analyze query for processing and optimization
 */
export class CompiledQuery extends Query {
  public readonly $select: CompiledResultColumn[]
  public readonly $from?: CompiledFromTable[]
  public readonly $where?: CompiledConditionalExpression
  public readonly $group?: CompiledGroupBy
  public readonly $order?: CompiledOrderBy[]
  public readonly $limit?: CompiledLimitOffset

  public readonly options: ICompileOptions

  /**
   * @param engine [InMemoryDatabaseEngine]
   * @param jql [AnalyzedQuery]
   * @param options [ICompileOptions] optional
   */
  constructor(engine: InMemoryDatabaseEngine, private readonly jql: Query, options: Partial<ICompileOptions> = {}) {
    super(jql)

    // initialize options
    const options_ = this.options = {
      tables: {},
      tablesOrder: [],
      ...options,
    }

    // analyze tables
    if (jql.$from) {
      this.$from = jql.$from.map(jql => new CompiledFromTable(engine, jql, options_))
    }

    // analyze wildcard
    const $select = jql.$select.reduce<ResultColumn[]>((result, resultColumn) => {
      if (resultColumn.expression instanceof NodeJQLColumnExpression && resultColumn.expression.isWildcard) {
        if (resultColumn.expression.table) {
          const table = options_.tables[resultColumn.expression.table]
          result.push(...table.columns.map(({ name }) => new ResultColumn(new NodeJQLColumnExpression(table.name, name))))
        }
        else {
          for (const name of options_.tablesOrder) {
            const table = options_.tables[name]
            result.push(...table.columns.map(({ name }) => new ResultColumn(new NodeJQLColumnExpression(table.name, name))))
          }
        }
      }
      else {
        result.push(resultColumn)
      }
      return result
    }, [])
    this.$select = $select.map(jql => new CompiledResultColumn(engine, jql, options_))

    // analyze WHERE conditions
    if (jql.$where) this.$where = compile(engine, jql.$where, options_)

    // analyze GROUP BY statement
    if (jql.$group) this.$group = new CompiledGroupBy(engine, jql.$group, options_)

    // analyze ORDER BY statement
    if (jql.$order) this.$order = jql.$order.map(jql => new CompiledOrderBy(engine, jql, options_))

    // analyze OFFSET statement
    if (jql.$limit) this.$limit = new CompiledLimitOffset(engine, jql.$limit, options_)
  }

  /**
   * Predict the structure of the result
   */
  get table(): Table {
    return new Table(this.options.$as || uuid(), this.$select.map(({ id, expression, $as }) => {
      const name = $as || (expression instanceof ColumnExpression ? expression.name : expression.toString())
      return new Column(id, name, expression.type)
    }))
  }

  // @override
  get isQuick(): boolean {
    return this.jql.isQuick
  }

  // @override
  get isQuickCount(): boolean {
    return this.jql.isQuickCount
  }

  // @override
  public toString(): string {
    return this.jql.toString()
  }
}
