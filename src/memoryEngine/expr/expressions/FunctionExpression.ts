import { checkNull, ColumnExpression, FunctionExpression as NodeJQLFunctionExpression, IFunctionExpression, ParameterExpression as NodeJQLParameterExpression, Type } from 'node-jql'
import squel = require('squel')
import uuid = require('uuid/v4')
import { CompiledExpression } from '..'
import { Cursor } from '../../cursor'
import { JQLAggregateFunction, JQLFunction } from '../../function'
import { Sandbox } from '../../sandbox'
import { ICompileOptions } from '../compile'
import { ParameterExpression } from './ParameterExpression'

/**
 * Analyze FunctionExpression
 */
export class FunctionExpression extends CompiledExpression implements IFunctionExpression {
  public readonly classname = FunctionExpression.name

  public readonly id = uuid()
  public readonly parameters: ParameterExpression[]
  public readonly function: JQLFunction

  /**
   * @param jql [NodeJQLFunctionExpression]
   * @param options [ICompileOptions]
   */
  constructor(private readonly jql: NodeJQLFunctionExpression, options: ICompileOptions) {
    super()
    // set function
    this.function = options.functions[jql.name.toLocaleLowerCase()]()
    if (this.isAggregate && jql.parameters.length !== 1) throw new SyntaxError(`Aggregate function ${jql.name} should have exactly 1 argument`)
    this.function.interpret(jql.parameters)

    // compile parameters
    let parameters = jql.parameters
    if (this.isAggregate && jql.parameters[0].expression instanceof ColumnExpression && jql.parameters[0].expression.isWildcard) {
      parameters = []
      const { expression } = jql.parameters[0]
      if (expression.table) {
        const tableName = expression.table
        const table = options.tables[tableName]
        parameters.push(...table.columns.map(({ name }) => new NodeJQLParameterExpression(null, new ColumnExpression(tableName, name))))
      }
      else {
        for (const name of options.ownTables) {
          const table = options.tables[name]
          parameters.push(...table.columns.map(column => new NodeJQLParameterExpression(null, new ColumnExpression(name, column.name))))
        }
      }
    }
    this.parameters = parameters.map(jql => new ParameterExpression(jql, options))

    // register aggregate function
    if (this.function instanceof JQLAggregateFunction) options.aggregateFunctions.push(this)
  }

  /**
   * Whether it is an aggregate function
   */
  get isAggregate(): boolean {
    return this.function instanceof JQLAggregateFunction
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
    if (this.function instanceof JQLAggregateFunction) {
      const value = await cursor.get(this.id)
      if (!checkNull(value)) return value

      if (await cursor.moveToFirst()) {
        do { args.push(await Promise.all(this.parameters.map(parameter => parameter.evaluate(sandbox, cursor)))) }
        while (await cursor.next())
      }
    }
    else {
      args = await Promise.all(this.parameters.map(parameter => parameter.evaluate(sandbox, cursor)))
    }
    return this.function.run(...args)
  }
}
