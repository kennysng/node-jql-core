import { ColumnExpression, JoinedTableOrSubquery, Query, ResultColumn } from 'node-jql'
import { Column } from '../../../schema/column'
import { Table } from '../../../schema/table'
import { NotFoundError } from '../../../utils/error/NotFoundError'
import { CompiledSql, ICompilingOptions, ICompilingQueryOptions } from '../compiledSql'
import { CompiledConditionalExpression } from '../expression'
import { CompiledColumnExpression } from '../expression/column'
import { compile } from '../expression/compile'
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

  private flagSimpleQuery?: boolean = undefined
  private flagTempTables?: boolean = undefined

  private readonly options: ICompilingQueryOptions

  constructor(private readonly query: Query, baseOptions: ICompilingOptions, public readonly $as?: string, public readonly key?: string) {
    super(query)

    // initialize compiling options
    const options: ICompilingQueryOptions = this.options = {
      aliases: {},
      tables: [],
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
        options.tables.push(tableOrSubquery)
        if (tableOrSubquery instanceof CompiledJoinedTableOrSubquery) {
          options.tables.push(...tableOrSubquery.joinClauses.map(({ tableOrSubquery }) => tableOrSubquery))
        }
      }
    }

    // interpret wildcard columns
    const $select = query.$select.reduce<ResultColumn[]>((result, resultColumn, i) => {
      if (resultColumn.expression instanceof ColumnExpression && resultColumn.expression.isWildcard) {
        const expression = resultColumn.expression
        const tables = options.tables.map(({ databaseKey, tableKey, query, $as }) => {
          if (query) return query.structure
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
   * List the Tables involved
   */
  get tables(): string[] {
    return this.options.tables.reduce<string[]>((result, { tableKey }) => {
      if (tableKey && result.indexOf(tableKey) === -1) result.push(tableKey)
      return result
    }, [])
  }

  /**
   * Estimate the structure of the ResultSet
   */
  get structure(): Table {
    const table = new Table(this.$as || 'TEMP_TABLE', this.key)
    for (const { expression, $as, key } of this.$select) {
      if (expression instanceof CompiledColumnExpression) {
        const { databaseKey, tableKey, columnKey } = expression
        const database = this.options.schema.getDatabase(databaseKey)
        table.addColumn(database.getTable(tableKey).getColumn(columnKey))
      }
      /* TODO else if (expression instanceof CompiledFunctionExpression) {
        table.addColumn(new Column($as || expression.toString(), expression.jqlFunction.type, key))
      } */
      else if (expression instanceof Value) {
        table.addColumn(new Column($as || expression.toString(), expression.type, key))
      }
      else if (expression instanceof Unknown) {
        throw new TypeError('ResultColumn should not be an Unknown')
      }
      else {
        table.addColumn(new Column($as || expression.toString(), 'boolean', key))
      }
    }
    return table
  }

  /**
   * SELECT * FROM Table
   */
  get isSimpleQuery(): boolean {
    if (this.flagSimpleQuery === undefined) {
      this.flagSimpleQuery = (
        this.query.$from &&
        this.query.$from.length === 1 &&
        !(this.query.$from[0] instanceof JoinedTableOrSubquery) &&
        !this.query.$where &&
        !this.query.$group &&
        !this.query.$order &&
        this.query.$select.length === 1 &&
        this.query.$select[0].expression instanceof ColumnExpression &&
        this.query.$select[0].expression.isWildcard
      )
    }
    return this.flagSimpleQuery || false
  }

  /**
   * SELECT * FROM (SELECT ...) t
   */
  get needTempTables(): boolean {
    if (this.flagTempTables === undefined) {
      this.flagTempTables = !!this.$from && this.needTempTables_(this.$from)
    }
    return this.flagTempTables || false
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

  private needTempTables_($from: CompiledTableOrSubquery[]): boolean {
    for (const tableOrSubquery of $from) {
      if (tableOrSubquery.$as) return true
      if (tableOrSubquery instanceof CompiledJoinedTableOrSubquery && this.needTempTables_(tableOrSubquery.joinClauses.map(({ tableOrSubquery }) => tableOrSubquery))) return true
    }
    return false
  }
}
