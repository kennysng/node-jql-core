import { FunctionExpression as NodeJQLFunctionExpression, IFunctionExpression, Type } from 'node-jql'
import squel = require('squel')
import { CompiledExpression } from '..'
import { InMemoryDatabaseEngine } from '../..'
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

  public readonly parameters: ParameterExpression[]
  public readonly function: JQLFunction

  /**
   * @param engine [InMemoryDatabaseEngine]
   * @param jql [NodeJQLFunctionExpression]
   * @param options [ICompileOptions]
   */
  constructor(engine: InMemoryDatabaseEngine, private readonly jql: NodeJQLFunctionExpression, options: ICompileOptions) {
    super()
    this.parameters = jql.parameters.map(jql => new ParameterExpression(engine, jql, options))
    this.function = engine.functions[jql.name.toLocaleLowerCase()]()
    if (this.function instanceof JQLAggregateFunction && this.parameters.length !== 1) throw new SyntaxError(`Aggregate function ${jql.name} should have exactly 1 argument`)

    // interpret parameters
    this.function.interpret(this.parameters)
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
      if (await cursor.moveToFirst()) {
        do { args.push(await this.parameters[0].evaluate(sandbox, cursor)) }
        while (await cursor.next())
      }
    }
    else {
      args = await Promise.all(this.parameters.map(parameter => parameter.evaluate(sandbox, cursor)))
    }
    return this.function.run(...args)
  }
}
