import _ = require('lodash')
import { ColumnExpression, FunctionExpression, JoinedTableOrSubquery, Query, ResultColumn } from 'node-jql'
import { IMapping } from '../../../core/interfaces'
import { Column, Table } from '../../../schema'
import { NotFoundError } from '../../../utils/error/NotFoundError'
import { CompiledSql, ICompilingOptions, ICompilingQueryOptions, IExpressionWithKey } from '../compiledSql'
import { CompiledConditionalExpression } from '../expression'
import { CompiledColumnExpression } from '../expression/column'
import { compile } from '../expression/compile'
import { CompiledFunctionExpression } from '../expression/function'
import { Unknown } from '../expression/unknown'
import { Value } from '../expression/value'
import { CompiledGroupBy } from './groupBy'
import { CompiledOrderingTerm } from './orderingTerm'
import { CompiledResultColumn } from './resultColumn'
import { CompiledJoinedTableOrSubquery, CompiledTableOrSubquery } from './tableOrSubquery'

export class CompiledQuery extends CompiledSql {
  public readonly $select: CompiledResultColumn[]
  public readonly $from?: CompiledTableOrSubquery[]
  public readonly $where?: CompiledConditionalExpression
  public readonly $group?: CompiledGroupBy
  public readonly $order?: CompiledOrderingTerm[]

  private ownTables: CompiledTableOrSubquery[] = []
  private cacheMappings?: IMapping[]
  private cacheTables?: string[]
  private cacheColumns?: Array<IExpressionWithKey<CompiledColumnExpression>>
  private cacheAggregateFunctions?: Array<IExpressionWithKey<CompiledFunctionExpression>>
  private flagSimpleQuery?: boolean
  private flagSimpleCount?: boolean
  private flagFastQuery?: boolean
  private flagTempTables?: boolean
  private flagAggregate?: boolean

  private readonly options: ICompilingQueryOptions

  constructor(private readonly query: Query, baseOptions: ICompilingOptions, public readonly $as?: string, public readonly key?: string) {
    super(query)

    // initialize compiling options
    const options: ICompilingQueryOptions = this.options = {
      aliases: {},
      tables: [],
      columns: [],
      aggregateFunctions: [],
      unknowns: [],
      ...baseOptions,
    }

    // get the list of Tables involved
    if (query.$from) {
      this.$from = query.$from.map(tableOrSubquery => tableOrSubquery instanceof JoinedTableOrSubquery
        ? new CompiledJoinedTableOrSubquery(tableOrSubquery, options)
        : new CompiledTableOrSubquery(tableOrSubquery, options),
      )

      for (const tableOrSubquery of this.$from) {
        this.registerTable(this.ownTables, tableOrSubquery)
        if (tableOrSubquery instanceof CompiledJoinedTableOrSubquery) {
          this.registerTable(this.ownTables, ...tableOrSubquery.joinClauses.map(({ tableOrSubquery }) => tableOrSubquery))
        }
      }
      this.registerTable(options.tables, ...this.ownTables)
    }

    // interpret wildcard columns
    const $select = query.$select.reduce<ResultColumn[]>((result, resultColumn) => {
      if (resultColumn.expression instanceof ColumnExpression && resultColumn.expression.isWildcard) {
        const expression = resultColumn.expression
        const tables = options.tables.map(({ databaseKey, tableKey, structure, $as }) => {
          if (structure) return structure
          let table = options.schema.getDatabase(databaseKey).getTable(tableKey as string)
          if ($as) table = table.clone($as)
          return table
        })
        if (expression.table) {
          const table = tables.find(({ name }) => name === expression.table)
          if (!table) throw new NotFoundError(`Table '${expression.name}' not found`)
          for (const column of table.columns) result.push(new ResultColumn({ expression: new ColumnExpression([table.name, column.name]) }))
        }
        else {
          for (const table of tables) {
            for (const column of table.columns) result.push(new ResultColumn({ expression: new ColumnExpression([table.name, column.name]) }))
          }
        }
      }
      else {
        result.push(resultColumn)
      }
      return result
    }, [])

    // compile $select
    this.$select = $select.map(resultColumn => new CompiledResultColumn(resultColumn, options))

    // compile $where
    if (query.$where) this.$where = compile(query.$where, options)

    // compile $group
    if (query.$group) this.$group = new CompiledGroupBy(query.$group, this.$select, options)

    // compile $order
    if (query.$order) this.$order = query.$order.map(orderingTerm => new CompiledOrderingTerm(orderingTerm, this.$select, options))
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledQuery'
  }

  /**
   * DISTINCT
   */
  get $distinct(): boolean {
    return this.query.$distinct || false
  }

  /**
   * LIMIT
   */
  get $limit(): number {
    return this.query.$limit ? this.query.$limit.value : Number.MAX_SAFE_INTEGER
  }

  /**
   * OFFSET
   */
  get $offset(): number {
    return this.query.$limit ? this.query.$limit.$offset || 0 : 0
  }

  /**
   * List all the Unknowns
   */
  get unknowns(): Unknown[] {
    return this.options.unknowns
  }

  /**
   * Column mappings for result set
   */
  get mappings(): IMapping[] {
    if (this.cacheMappings === undefined) {
      this.cacheMappings = this.$select.map<IMapping>(({ expression, key, $as }) => {
        const result = { name: $as || expression.toString(), key } as IMapping
        if (expression instanceof CompiledColumnExpression) {
          result.table = expression.table
          result.column = $as || expression.name
        }
        return result
      })
    }
    return this.cacheMappings
  }

  /**
   * List the Tables involved
   */
  get tables(): string[] {
    if (this.cacheTables === undefined) {
      const tables = this.options.tables.map<string>(({ tableKey }) => tableKey)
      this.cacheTables = _.uniq(tables)
    }
    return this.cacheTables
  }

  /**
   * List the Columns to be retrieved
   */
  get columns(): Array<IExpressionWithKey<CompiledColumnExpression>> {
    if (this.cacheColumns === undefined) {
      const columns = this.options.columns
        .filter(column => this.ownTables.find(({ key }) => column.tableKey === key))
        .map<IExpressionWithKey<CompiledColumnExpression>>(expression => ({ expression, key: expression.key }))
      this.cacheColumns = _.uniqBy(columns, ({ key }) => key)
    }
    return this.cacheColumns
  }

  /**
   * List the aggregate functions to be evaluated
   */
  get aggregateFunctions(): Array<IExpressionWithKey<CompiledFunctionExpression>> {
    if (this.cacheAggregateFunctions === undefined) {
      this.cacheAggregateFunctions = this.options.aggregateFunctions
        .map(expression => ({
          expression,
          key: expression.key,
        }))
    }
    return this.cacheAggregateFunctions
  }

  /**
   * Estimate the structure of the result set
   */
  get structure(): Table {
    const table = new Table(this.$as || 'TEMP_TABLE', this.key)
    for (const { expression, $as, key } of this.$select) {
      if (expression instanceof CompiledColumnExpression) {
        const { databaseKey, tableKey, columnKey } = expression
        const database = this.options.schema.getDatabase(databaseKey)
        table.addColumn(database.getTable(tableKey).getColumn(columnKey))
      }
      else if (expression instanceof CompiledFunctionExpression) {
        table.addColumn(new Column($as || expression.toString(), expression.jqlFunction.type, key))
      }
      else if (expression instanceof Value || expression instanceof Unknown) {
        table.addColumn(new Column($as || expression.toString(), expression.type, key))
      }
      else {
        table.addColumn(new Column($as || expression.toString(), 'boolean', key))
      }
    }
    return table
  }

  /**
   * Has LIMIT ... OFFSET ...
   */
  get hasLimitOffset(): boolean {
    if (!this.query.$limit) return false
    return !(this.$offset === 0 && this.$limit === Number.MAX_SAFE_INTEGER)
  }

  /**
   * One wildcard Column, one Table, no WHERE, no GROUP BY, and simple ORDER BY
   * -> Simply retrieve Rows from the DataSource
   */
  get isSimpleQuery(): boolean {
    if (this.flagSimpleQuery === undefined) {
      this.flagSimpleQuery = (
        this.query.$from &&
        this.query.$from.length === 1 &&
        !(this.query.$from[0] instanceof JoinedTableOrSubquery) &&
        !this.query.$where &&
        !this.query.$group &&
        (!this.query.$order || this.query.$order.find(({ expression }) => !(expression instanceof ColumnExpression))) &&
        this.query.$select.length === 1 &&
        this.query.$select[0].expression instanceof ColumnExpression &&
        this.query.$select[0].expression.isWildcard
      )
    }
    return this.flagSimpleQuery || false
  }

  /**
   * One COUNT(expr) Column, one Table, no WHERE, and no GROUP BY, and simple ORDER BY
   * -> Simply retrieve Rows from the DataSource
   * -> Simple aggregate the Rows retrieved
   */
  get isSimpleCount(): boolean {
    if (this.flagSimpleCount === undefined) {
      this.flagSimpleCount = (
        this.query.$from &&
        this.query.$from.length === 1 &&
        !(this.query.$from[0] instanceof JoinedTableOrSubquery) &&
        !this.query.$where &&
        !this.query.$group &&
        (!this.query.$order || this.query.$order.find(({ expression }) => !(expression instanceof ColumnExpression))) &&
        this.query.$select.length === 1 &&
        this.query.$select[0].expression instanceof FunctionExpression &&
        this.query.$select[0].expression.name.toLocaleLowerCase() === 'count'
      )
    }
    return this.flagSimpleCount || false
  }

  /**
   * No DISTINCT, no GROUP BY, and no ORDER BY
   * -> Do LIMIT at traverse level
   */
  get isFastQuery(): boolean {
    if (this.flagFastQuery === undefined) {
      this.flagFastQuery = (
        !this.$distinct &&
        !this.query.$group &&
        !this.query.$order
      )
    }
    return this.flagFastQuery || false
  }

  /**
   * Has sub-Query
   */
  get needTempTables(): boolean {
    if (this.flagTempTables === undefined) {
      this.flagTempTables = !!this.$from && this.needTempTables_(this.$from)
    }
    return this.flagTempTables || false
  }

  /**
   * Need aggregation
   */
  get needAggregate(): boolean {
    if (this.flagAggregate === undefined) {
      this.flagAggregate = !!this.$group || this.hasAggregateFunction(this.$select)
    }
    return this.flagAggregate || false
  }

  /**
   * Assign value to specific Unknown
   * @param i [number]
   * @param value [any]
   */
  public setArg(i: number, value: any): CompiledQuery {
    const unknown = this.unknowns[i]
    if (!unknown) throw new NotFoundError(`Unknown #${i} not found`)
    this.unknowns[i].assign(value)
    return this
  }

  // @override
  public equals(obj: CompiledQuery): boolean {
    if (this === obj) return true
    if (this.$distinct !== obj.$distinct || this.$limit !== obj.$limit || this.$offset !== obj.$limit) return false
    if (this.$select.length !== obj.$select.length) return false
    for (const resultColumn of this.$select) {
      if (!obj.$select.find(r => resultColumn.equals(r))) return false
    }
    if ((this.$from && !obj.$from) || (!this.$from && obj.$from)) return false
    if (this.$from && obj.$from) {
      if (this.$from.length !== obj.$from.length) return false
      for (const tableOrSubquery of this.$from) {
        if (!obj.$from.find(t => tableOrSubquery.equals(t))) return false
      }
    }
    if ((this.$where && !obj.$where) || (!this.$where && obj.$where)) return false
    if (this.$where && obj.$where && !this.$where.equals(obj.$where)) return false
    if ((this.$group && !obj.$group) || (!this.$group && obj.$group)) return false
    if (this.$group && obj.$group && !this.$group.equals(obj.$group)) return false
    if ((this.$order && !obj.$order) || (!this.$order && obj.$order)) return false
    if (this.$order && obj.$order) {
      if (this.$order.length !== obj.$order.length) return false
      for (const tableOrSubquery of this.$order) {
        if (!obj.$order.find(t => tableOrSubquery.equals(t))) return false
      }
    }
    return true
  }

  private registerTable(array: CompiledTableOrSubquery[], ...tables: CompiledTableOrSubquery[]) {
    array.push(...tables)
  }

  private needTempTables_($from: CompiledTableOrSubquery[]): boolean {
    for (const tableOrSubquery of $from) {
      if (tableOrSubquery.$as) return true
      if (tableOrSubquery instanceof CompiledJoinedTableOrSubquery && this.needTempTables_(tableOrSubquery.joinClauses.map(({ tableOrSubquery }) => tableOrSubquery))) return true
    }
    return false
  }

  private hasAggregateFunction($select: CompiledResultColumn[]): boolean {
    return $select.reduce<boolean>((result, { expression }) => result || expression.aggregateRequired, false)
  }
}
