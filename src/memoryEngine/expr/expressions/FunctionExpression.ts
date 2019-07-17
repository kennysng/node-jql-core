import { checkNull, ColumnExpression, FunctionExpression, IFunctionExpression, ParameterExpression, Type } from 'node-jql'
import squel = require('squel')
import uuid = require('uuid/v4')
import { CompiledExpression } from '..'
import { Cursor } from '../../cursor'
import { GenericJQLFunction, JQLAggregateFunction, JQLFunction } from '../../function'
import { ICompileOptions } from '../../interface'
import { Sandbox } from '../../sandbox'
import { CompiledParameterExpression } from './ParameterExpression'

/**
 * Analyze FunctionExpression
 */
export class CompiledFunctionExpression extends CompiledExpression implements IFunctionExpression {
  public readonly classname = CompiledFunctionExpression.name

  public readonly id = uuid()
  public readonly parameters: CompiledParameterExpression[]
  public readonly function: JQLFunction

  /**
   * @param jql [FunctionExpression]
   * @param options [ICompileOptions]
   */
  constructor(private readonly jql: FunctionExpression, options: ICompileOptions) {
    super()
    // set function
    this.function = options.functions[jql.name.toLocaleLowerCase()]()
    this.function.interpret(jql.parameters)

    // compile parameters
    let parameters = jql.parameters
    if (this.isAggregate && jql.parameters[0].expression instanceof ColumnExpression && jql.parameters[0].expression.isWildcard) {
      parameters = []
      const { expression } = jql.parameters[0]
      if (expression.table) {
        const tableName = expression.table
        const table = options.tables[tableName]
        parameters.push(...table.columns.map(({ name }) => new ParameterExpression(null, new ColumnExpression(tableName, name))))
      }
      else {
        for (const name of options.ownTables) {
          const table = options.tables[name]
          parameters.push(...table.columns.map(column => new ParameterExpression(null, new ColumnExpression(name, column.name))))
        }
      }
    }
    this.parameters = parameters.map(jql => new CompiledParameterExpression(jql, options))

    // register aggregate function
    if (this.isAggregate) options.aggregateFunctions.push(this)
  }

  /**
   * Whether it is an aggregate function
   */
  get isAggregate(): boolean {
    return this.function instanceof JQLAggregateFunction || (this.function instanceof GenericJQLFunction && this.function.aggregate)
  }

  // @override
  get type(): Type {
    return this.function.type
  }

  // @override
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
  public toJson(): IFunctionExpression {
    return this.jql.toJson()
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<any> {
    let args: any[] = []
    if (this.isAggregate) {
      const value = await cursor.get(this.id)
      if (!checkNull(value)) return value

      if (await cursor.moveToFirst()) {
        do {
          const row = {} as any
          for (const { expression } of this.parameters) {
            let name = expression.toString()
            if (expression instanceof ColumnExpression && !row[expression.name]) name = expression.name
            row[name] = await expression.evaluate(sandbox, cursor)
          }
          args.push(row)
        }
        while (await cursor.next())
      }
    }
    else {
      args = await Promise.all(this.parameters.map(parameter => parameter.evaluate(sandbox, cursor)))
    }
    return this.function.run(...args)
  }
}
