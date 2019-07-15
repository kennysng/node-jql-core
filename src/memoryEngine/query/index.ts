import _ from 'lodash'
import { ColumnExpression as NodeJQLColumnExpression, JQL, Query, ResultColumn } from 'node-jql'
import uuid = require('uuid/v4')
import { CompiledConditionalExpression } from '../expr'
import { compile, ICompileOptions } from '../expr/compile'
import { AndExpressions } from '../expr/expressions/AndExpressions'
import { BetweenExpression } from '../expr/expressions/BetweenExpression'
import { BinaryExpression } from '../expr/expressions/BinaryExpression'
import { CaseExpression } from '../expr/expressions/CaseExpression'
import { ColumnExpression } from '../expr/expressions/ColumnExpression'
import { ExistsExpression } from '../expr/expressions/ExistsExpression'
import { FunctionExpression } from '../expr/expressions/FunctionExpression'
import { InExpression } from '../expr/expressions/InExpression'
import { IsNullExpression } from '../expr/expressions/IsNullExpression'
import { LikeExpression } from '../expr/expressions/LikeExpression'
import { MathExpression } from '../expr/expressions/MathExpression'
import { OrExpressions } from '../expr/expressions/OrExpressions'
import { ParameterExpression } from '../expr/expressions/ParameterExpression'
import { JQLAggregateFunction, JQLFunction } from '../function'
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
  public readonly $union?: CompiledQuery

  public readonly options: ICompileOptions

  /**
   * @param jql [AnalyzedQuery]
   * @param options [ICompileOptions] optional
   */
  constructor(private readonly jql: Query, options: Partial<ICompileOptions> & { getTable: (database: string, table: string) => Table, functions: _.Dictionary<() => JQLFunction> }) {
    super(jql)

    // initialize options
    let options_ = this.options = {
      tables: {},
      tablesOrder: [],
      ...options,
      ownTables: [],
      columns: [],
      aggregateFunctions: [],
    }

    // analyze tables
    if (jql.$from) {
      this.$from = jql.$from.map(jql => new CompiledFromTable(jql, options_))
    }

    // analyze wildcard
    const $select = jql.$select.reduce<ResultColumn[]>((result, resultColumn) => {
      if (resultColumn.expression instanceof NodeJQLColumnExpression && resultColumn.expression.isWildcard) {
        if (resultColumn.expression.table) {
          const tableName = resultColumn.expression.table
          const table = options_.tables[tableName]
          result.push(...table.columns.map(({ name }) => new ResultColumn(new NodeJQLColumnExpression(tableName, name))))
        }
        else {
          for (const name of options_.ownTables) {
            const table = options_.tables[name]
            result.push(...table.columns.map(column => new ResultColumn(new NodeJQLColumnExpression(name, column.name))))
          }
        }
      }
      else {
        result.push(resultColumn)
      }
      return result
    }, [])
    this.$select = $select.map(jql => new CompiledResultColumn(jql, options_))

    // lock columns
    options_ = { ...options_, columns: [] }

    // analyze GROUP BY statement first
    if (jql.$group) this.$group = new CompiledGroupBy(jql.$group, options_)

    // lock aggregate functions
    options_ = { ...options_, aggregateFunctions: [] }

    // analyze WHERE conditions
    if (jql.$where) this.$where = compile(jql.$where, options_)

    // analyze ORDER BY statement
    if (jql.$order) this.$order = jql.$order.map(jql => new CompiledOrderBy(jql, options_))

    // analyze OFFSET statement
    if (jql.$limit) this.$limit = new CompiledLimitOffset(jql.$limit, options_)

    // analyze UNION query
    if (jql.$union) {
      this.$union = new CompiledQuery(jql.$union, {
        ...options_,
        tables: {},
        tablesOrder: [],
        ownTables: [],
        columns: [],
        aggregateFunctions: [],
      })

      // check column numbers
      if (this.table.columns.length !== this.$union.table.columns.length) throw new SyntaxError(`Column numbers not matched: ${this.toString()}`)
    }
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

  /**
   * Columns required
   */
  get columns(): ColumnExpression[] {
    return this.options.columns
  }

  /**
   * Check aggregation required
   */
  get needAggregate(): boolean {
    for (const { expression } of this.$select) if (this.checkAggregate(expression)) return true
    return false
  }

  /**
   * List of aggregate functions used
   */
  get aggregateFunctions(): FunctionExpression[] {
    return this.options.aggregateFunctions
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

  private checkAggregate(jql: JQL): boolean {
    if (jql instanceof CompiledQuery) {
      return jql.needAggregate
    }
    else if (jql instanceof AndExpressions || jql instanceof OrExpressions) {
      const { expressions } = jql
      for (const expression of expressions) if (this.checkAggregate(expression)) return true
    }
    else if (jql instanceof BetweenExpression) {
      const { left, start, end } = jql
      return this.checkAggregate(left) || this.checkAggregate(start) || this.checkAggregate(end)
    }
    else if (jql instanceof BinaryExpression || jql instanceof LikeExpression || jql instanceof MathExpression) {
      const { left, right } = jql
      return this.checkAggregate(left) || this.checkAggregate(right)
    }
    else if (jql instanceof CaseExpression) {
      const { cases, $else } = jql
      for (const { $when, $then } of cases) if (this.checkAggregate($when) || this.checkAggregate($then)) return true
      if ($else) return this.checkAggregate($else)
    }
    else if (jql instanceof ExistsExpression) {
      return this.checkAggregate(jql.query)
    }
    else if (jql instanceof FunctionExpression) {
      return jql.function instanceof JQLAggregateFunction
    }
    else if (jql instanceof InExpression) {
      const { right } = jql
      return this.checkAggregate(right)
    }
    else if (jql instanceof IsNullExpression) {
      const { left } = jql
      return this.checkAggregate(left)
    }
    else if (jql instanceof ParameterExpression) {
      const { expression } = jql
      return this.checkAggregate(expression)
    }
    return false
  }
}
