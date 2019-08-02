import _ from 'lodash'
import { ColumnExpression as NodeJQLColumnExpression, IQuery, JQL, Query, ResultColumn } from 'node-jql'
import uuid = require('uuid/v4')
import { CompiledConditionalExpression } from '../expr'
import { compile } from '../expr/compile'
import { CompiledAndExpressions } from '../expr/expressions/AndExpressions'
import { CompiledBetweenExpression } from '../expr/expressions/BetweenExpression'
import { CompiledBinaryExpression } from '../expr/expressions/BinaryExpression'
import { CompiledCaseExpression } from '../expr/expressions/CaseExpression'
import { CompiledColumnExpression } from '../expr/expressions/ColumnExpression'
import { CompiledExistsExpression } from '../expr/expressions/ExistsExpression'
import { CompiledFunctionExpression } from '../expr/expressions/FunctionExpression'
import { CompiledInExpression } from '../expr/expressions/InExpression'
import { CompiledIsNullExpression } from '../expr/expressions/IsNullExpression'
import { CompiledLikeExpression } from '../expr/expressions/LikeExpression'
import { CompiledMathExpression } from '../expr/expressions/MathExpression'
import { CompiledOrExpressions } from '../expr/expressions/OrExpressions'
import { CompiledParameterExpression } from '../expr/expressions/ParameterExpression'
import { CompiledRegexpExpression } from '../expr/expressions/RegexpExpression'
import { JQLFunction } from '../function'
import { ICompileOptions } from '../interface'
import { MemoryColumn, MemoryTable } from '../table'
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
  constructor(private readonly jql: Query, options: Partial<ICompileOptions> & { getTable: (database: string, table: string) => MemoryTable, functions: _.Dictionary<() => JQLFunction> }) {
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
        axiosInstance: options.axiosInstance,
        defDatabase: options.defDatabase,
        getTable: options.getTable,
        functions: options.functions,
      })

      // check column numbers
      if (this.table.columns.length !== this.$union.table.columns.length) throw new SyntaxError(`Column numbers not matched: ${this.toString()}`)
    }
  }

  /**
   * Predict the structure of the result
   */
  get table(): MemoryTable {
    return new MemoryTable(this.options.$as || uuid(), this.$select.map(({ id, expression, $as }) => {
      const name = $as || (expression instanceof CompiledColumnExpression ? expression.name : expression.toString())
      return new MemoryColumn(id, name, expression.type)
    }))
  }

  /**
   * Columns required
   */
  get columns(): CompiledColumnExpression[] {
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
  get aggregateFunctions(): CompiledFunctionExpression[] {
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

  // @override
  public toJson(): IQuery {
    return this.jql.toJson()
  }

  private checkAggregate(jql: JQL): boolean {
    if (jql instanceof CompiledQuery) {
      return jql.needAggregate
    }
    else if (jql instanceof CompiledAndExpressions || jql instanceof CompiledOrExpressions) {
      const { expressions } = jql
      for (const expression of expressions) if (this.checkAggregate(expression)) return true
    }
    else if (jql instanceof CompiledBetweenExpression) {
      const { left, start, end } = jql
      return this.checkAggregate(left) || this.checkAggregate(start) || this.checkAggregate(end)
    }
    else if (jql instanceof CompiledBinaryExpression || jql instanceof CompiledLikeExpression || jql instanceof CompiledMathExpression || jql instanceof CompiledRegexpExpression) {
      const { left, right } = jql
      return this.checkAggregate(left) || this.checkAggregate(right)
    }
    else if (jql instanceof CompiledCaseExpression) {
      const { cases, $else } = jql
      for (const { $when, $then } of cases) if (this.checkAggregate($when) || this.checkAggregate($then)) return true
      if ($else) return this.checkAggregate($else)
    }
    else if (jql instanceof CompiledExistsExpression) {
      return this.checkAggregate(jql.query)
    }
    else if (jql instanceof CompiledFunctionExpression) {
      return jql.isAggregate || jql.parameters.reduce<boolean>((result, expression) => result || this.checkAggregate(expression), false)
    }
    else if (jql instanceof CompiledInExpression) {
      const { right } = jql
      return this.checkAggregate(right)
    }
    else if (jql instanceof CompiledIsNullExpression) {
      const { left } = jql
      return this.checkAggregate(left)
    }
    else if (jql instanceof CompiledParameterExpression) {
      const { expression } = jql
      return this.checkAggregate(expression)
    }
    return false
  }
}
