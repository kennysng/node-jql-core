import { ColumnExpression, JoinedTableOrSubquery, Query, ResultColumn } from 'node-jql'
import uuid = require('uuid/v4')
import { DatabaseEngine } from '..'
import { IQueryResult } from '../../../core/interfaces'
import { Functions } from '../../../function/functions'
import { Schema } from '../../../schema'
import { Column } from '../../../schema/column'
import { Table } from '../../../schema/table'
import { NotFoundError } from '../../../utils/error/NotFoundError'
import { CompiledSql, ICompilingOptions, ICompilingQueryOptions, isICompilingQueryOptions, ITableInfo } from '../compiledSql'
import { CompiledExpression } from '../expression'
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
  public readonly $where?: CompiledExpression
  public readonly $group?: CompiledGroupBy
  public readonly $order?: CompiledOrderingTerm[]

  public readonly aliases: { [key: string]: string } = {}
  public readonly tables: ITableInfo[] = []
  public readonly unknowns: Unknown[] = []

  private readonly key = uuid()

  constructor(private readonly query: Query, private readonly baseOptions: ICompilingOptions) {
    super(query)

    if (isICompilingQueryOptions(baseOptions)) {
      this.aliases = baseOptions.aliases
      this.tables = baseOptions.tables
      this.unknowns = baseOptions.unknowns
    }

    const options: ICompilingQueryOptions = {
      ...baseOptions,
      aliases: this.aliases,
      tables: this.tables,
      unknowns: this.unknowns,
    }

    // get the list of Tables involved
    if (query.$from) {
      this.$from = query.$from.map(tableOrSubquery => tableOrSubquery instanceof JoinedTableOrSubquery
        ? new CompiledJoinedTableOrSubquery(tableOrSubquery, options)
        : new CompiledTableOrSubquery(tableOrSubquery, options),
      )

      this.tables = options.tables = options.tables.concat(this.$from.reduce<ITableInfo[]>((result, tableOrSubquery) => {
        result.push(tableOrSubquery.tableInfo)
        if (tableOrSubquery instanceof CompiledJoinedTableOrSubquery) {
          result.push(...tableOrSubquery.joinClauses.map(({ tableOrSubquery }) => tableOrSubquery.tableInfo))
        }
        return result
      }, []))
    }

    // interpret wildcard columns
    const $select = query.$select.reduce<ResultColumn[]>((result, resultColumn, i) => {
      if (resultColumn.expression instanceof ColumnExpression && resultColumn.expression.isWildcard) {
        const expression = resultColumn.expression
        const tables = options.tables.map(tableInfo => options.schema.getDatabase(tableInfo.database).getTable(tableInfo.key))
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
    if (query.$group) this.$group = new CompiledGroupBy(query.$group, options)

    // compile $order
    if (query.$order) this.$order = query.$order.map(orderingTerm => new CompiledOrderingTerm(orderingTerm, options))

    // TODO validate
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledQuery'
  }

  get $distinct(): boolean {
    return this.query.$distinct || false
  }

  get $limit(): number {
    return this.query.$limit ? this.query.$limit.value : Number.MAX_SAFE_INTEGER
  }

  get $offset(): number {
    return this.query.$limit ? this.query.$limit.$offset || 0 : 0
  }

  /**
   * Estimate the structure of the ResultSet
   */
  get structure(): Table {
    const table = new Table(this.key, this.key)
    for (const { expression, $as, key } of this.$select) {
      if (expression instanceof CompiledColumnExpression) {
        const { databaseKey, tableKey, columnKey } = expression
        const database = this.baseOptions.schema.getDatabase(databaseKey)
        table.addColumn(database.getTable(tableKey).getColumn(columnKey))
      }
      else if (expression instanceof CompiledFunctionExpression) {
        table.addColumn(new Column($as || expression.toString(), expression.jqlFunction.type, key))
      }
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
}

/**
 * Bind CompiledQuery with DatabaseEngine
 */
export class PreparedQuery {
  private readonly compiled_: CompiledQuery

  constructor(private readonly engine: DatabaseEngine, public readonly query: Query, schema: Schema) {
    this.compiled_ = new CompiledQuery(query, {
      functions: new Functions(),
      schema,
    })
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'PreparedQuery'
  }

  /**
   * Predicted structure of the ResultSet
   */
  get structure(): Table {
    return this.compiled_.structure
  }

  /**
   * Reset all query parameters
   */
  public clearArgs(): void {
    for (const unknown of this.compiled_.unknowns) unknown.reset()
  }

  /**
   * Set query parameter
   * @param i [number]
   * @param value [any]
   */
  public setArg(i: number, value: any) {
    const unknown = this.compiled_.unknowns[i]
    if (!unknown) throw new NotFoundError(`Unknown #${i} not found`)
    unknown.assign(value)
  }

  /**
   * Run the Query
   * @param databaseName [string]
   */
  public execute(databaseName: string): Promise<IQueryResult> {
    return this.engine.query(databaseName, this.compiled_)
  }
}
