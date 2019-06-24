import { ColumnExpression, Type } from 'node-jql'
import { CompiledExpression } from '.'
import { TEMP_DB_KEY } from '../../../core'
import { Table } from '../../../schema'
import { JQLError } from '../../../utils/error'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICursor } from '../../core/cursor'
import { ICompilingQueryOptions } from '../compiledSql'
import { CompiledTableOrSubquery } from '../query/tableOrSubquery'

export class CompiledColumnExpression extends CompiledExpression {
  public readonly databaseKey: string
  public readonly tableKey: string
  public readonly columnKey: string
  public readonly type: Type
  public readonly aggregateRequired = false

  constructor(private readonly expression: ColumnExpression, options: ICompilingQueryOptions) {
    super(expression)
    try {
      // no $from
      if (!options.tables.length) throw new SyntaxError(`Unknown Column '${expression.name}'`)

      // table specified
      if (expression.table) {
        // get table info
        let tableOrSubquery: CompiledTableOrSubquery|undefined, tableNameOrKey: string
        if (options.aliases[expression.table]) {
          tableNameOrKey = options.aliases[expression.table]
          tableOrSubquery = options.tables.find(({ aliasKey }) => tableNameOrKey === aliasKey)
        }
        else {
          tableNameOrKey = expression.table
          tableOrSubquery = options.tables.find(({ $as }) => tableNameOrKey === $as)
        }
        if (!tableOrSubquery) throw new SyntaxError(`Unknown Table '${expression.table}'`)
        this.databaseKey = tableOrSubquery.databaseKey
        this.tableKey = tableOrSubquery.key

        // get column info
        const schema = this.databaseKey === TEMP_DB_KEY ? options.sandbox.schema : options.schema
        const table: Table = tableOrSubquery.structure || schema.getDatabase(this.databaseKey).getTable(tableOrSubquery.tableKey)
        const column = table.getColumn(expression.name)
        if (!column) throw new SyntaxError(`Unknown Column '${expression.name}'`)
        if (!column.isBinded) throw new JQLError(`Column '${expression.name}' is not binded to any Table`)
        this.columnKey = column.key
        this.type = column.type
      }
      // no table specified
      else {
        // get table info
        const tables = options.tables.filter(({ databaseKey, tableKey, structure }) => {
          try {
            if (structure) {
              structure.getColumn(expression.name)
            }
            else {
              const schema = databaseKey === TEMP_DB_KEY ? options.sandbox.schema : options.schema
              schema.getDatabase(databaseKey).getTable(tableKey as string).getColumn(expression.name)
            }
            return true
          }
          catch (e) {
            return false
          }
        })
        if (!tables.length) throw new SyntaxError(`Unknown Column '${expression.name}'`)
        if (tables.length > 1) throw new SyntaxError(`Ambiguous Column '${expression.name}'`)
        const { databaseKey, tableKey, structure } = tables[0]
        this.databaseKey = databaseKey
        this.tableKey = tableKey as string

        // get column info
        const schema = this.databaseKey === TEMP_DB_KEY ? options.sandbox.schema : options.schema
        const column = (structure || schema.getDatabase(databaseKey).getTable(tableKey as string)).getColumn(expression.name)
        this.columnKey = column.key
        this.type = column.type
      }

      options.columns.push(this)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile ColumnExpression', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledColumnExpression'
  }

  get table(): string|undefined {
    return this.expression.table
  }

  get name(): string {
    return this.expression.name
  }

  get key(): string {
    return `${this.tableKey}-${this.columnKey}`
  }

  // @override
  public equals(obj: CompiledColumnExpression): boolean {
    return this === obj || this.columnKey === obj.columnKey
  }

  // @override
  public async evaluate(cursor: ICursor): Promise<{ value: any, type: Type }> {
    return { value: await cursor.get(this.key), type: this.type }
  }
}
