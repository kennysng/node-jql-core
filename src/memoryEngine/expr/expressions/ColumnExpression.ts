import { ColumnExpression, IColumnExpression, Type } from 'node-jql'
import squel = require('squel')
import { CompiledExpression } from '..'
import { InMemoryError } from '../../../utils/error/InMemoryError'
import { Cursor } from '../../cursor'
import { ICompileOptions } from '../../interface'
import { Sandbox } from '../../sandbox'
import { MemoryColumn } from '../../table'

/**
 * Analyze ColumnExpression
 */
export class CompiledColumnExpression extends CompiledExpression implements IColumnExpression {
  public readonly classname = CompiledColumnExpression.name

  public readonly key: string
  public readonly type: Type

  /**
   * @param jql [ColumnExpression]
   * @param options [ICompileOptions]
   */
  constructor(private readonly jql: ColumnExpression, options: ICompileOptions) {
    super()
    let column: MemoryColumn|undefined
    if (jql.table) {
      const table = options.tables[jql.table]
      if (!table) throw new InMemoryError(`[FATAL] Table ${jql.table} expected to be found`)
      column = table.columns.find(column => column.name === jql.name)
    }
    else {
      for (const table of Object.keys(options.tables)) {
        const column_ = options.tables[table].columns.find(column => column.name === jql.name)
        if (column && column_) throw new InMemoryError(`Ambiguous column ${jql.name}`)
        column = column_
      }
    }
    if (!column) throw new SyntaxError(`Column ${jql.name} is not found ${jql.table ? `in table ${jql.table}` : '' }`)
    this.key = column.id
    this.type = column.type

    // register column
    if (!options.columns.find(({ key }) => key === this.key)) options.columns.push(this)
  }

  // @override
  get table(): string|undefined {
    return this.jql.table
  }

  // @ovrride
  get name(): string {
    return this.jql.name
  }

  // @override
  public validate(availableTables: string[]): void {
    this.jql.validate(availableTables)
  }

  // @override
  public toSquel(): squel.FunctionBlock {
    return this.jql.toSquel()
  }

  // @override
  public toJson(): IColumnExpression {
    return this.jql.toJson()
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<any> {
    return cursor.get(this.key)
  }
}
