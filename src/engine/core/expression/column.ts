import { ColumnExpression } from 'node-jql'
import { CompiledExpression } from '.'
import { Table } from '../../../schema/table'
import { JQLError } from '../../../utils/error'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { Sandbox } from '../sandbox'

export class CompiledColumnExpression extends CompiledExpression {
  public readonly databaseKey: string
  public readonly tableKey: string
  public readonly columnKey: string

  constructor(private readonly expression: ColumnExpression, options: ICompilingQueryOptions) {
    super(expression)
    try {
      // no $from
      if (!options.tables.length) throw new SyntaxError(`Unknown Column '${expression.name}'`)

      // table specified
      if (expression.table) {
        const tableNameOrKey = options.aliases[expression.table] || expression.table
        const tableInfo = options.tables.find(({ name, key }) => key === tableNameOrKey || (!!name && name === tableNameOrKey))
        if (!tableInfo) throw new SyntaxError(`Unknown Table '${expression.table}'`)

        this.databaseKey = tableInfo.database
        this.tableKey = tableInfo.key

        // get column key
        let table: Table
        if (tableInfo.tempTable) {
          table = tableInfo.tempTable
        }
        else {
          const database = options.schema.getDatabase(tableInfo.database)
          table = database.getTable(tableInfo.key)
        }
        const column = table.getColumn(expression.name)
        if (!column) throw new SyntaxError(`Unknown Column '${expression.name}'`)
        if (!column.isBinded) throw new JQLError(`Column '${expression.name}' is not binded to any Table`)
        this.columnKey = column.key
      }
      // no table specified
      else {
        const filteredTables = options.tables.filter(({ database, key, tempTable }) => {
          try {
            if (tempTable) {
              tempTable.getColumn(expression.name)
            }
            else {
              options.schema.getDatabase(database).getTable(key).getColumn(expression.name)
            }
            return true
          }
          catch (e) {
            return false
          }
        })
        if (!filteredTables.length) throw new SyntaxError(`Unknown Column '${expression.table}'`)
        if (filteredTables.length > 1) throw new SyntaxError(`Ambiguous Column '${expression.name}'`)
        const { database, key, tempTable } = filteredTables[0]
        this.databaseKey = database
        this.tableKey = key
        this.columnKey = (tempTable || options.schema.getDatabase(database).getTable(key)).getColumn(expression.name).key
      }
    }
    catch (e) {
      throw new InstantiateError('Fail to compile ColumnExpression', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledColumnExpression'
  }

  // @override
  public equals(obj: CompiledColumnExpression): boolean {
    return this === obj || this.columnKey === obj.columnKey
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<any> {
    return Promise.resolve(cursor.get(this.columnKey))
  }
}
