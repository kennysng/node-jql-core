import { IExpression, IParameterExpression, ParameterExpression as NodeJQLParameterExpression, Type } from 'node-jql'
import squel = require('squel')
import { CompiledExpression } from '..'
import { Cursor } from '../../cursor'
import { Sandbox } from '../../sandbox'
import { compile, ICompileOptions } from '../compile'

/**
 * Analyze ParameterExpression
 */
export class ParameterExpression extends CompiledExpression implements IParameterExpression {
  public readonly classname = ParameterExpression.name

  public readonly expression: CompiledExpression

  /**
   * @param jql [NodeJQLParameterExpression]
   * @param options [ICompileOptions]
   */
  constructor(private readonly jql: NodeJQLParameterExpression, options: ICompileOptions) {
    super()
    this.expression = compile(jql.expression, options)
  }

  // @override
  get type(): Type {
    return this.expression.type
  }

  // @override
  get prefix(): string|undefined {
    return this.jql.prefix
  }

  // @override
  get suffix(): string|undefined {
    return this.jql.suffix
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
  public toJson(): IExpression {
    return this.jql.toJson()
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<any> {
    return this.expression.evaluate(sandbox, cursor)
  }
}
