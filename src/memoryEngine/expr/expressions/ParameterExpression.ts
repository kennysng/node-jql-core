import { IExpression, IParameterExpression, ParameterExpression, Type } from 'node-jql'
import squel = require('squel')
import { CompiledExpression } from '..'
import { Cursor } from '../../cursor'
import { ICompileOptions } from '../../interface'
import { Sandbox } from '../../sandbox'
import { compile } from '../compile'

/**
 * Analyze ParameterExpression
 */
export class CompiledParameterExpression extends CompiledExpression implements IParameterExpression {
  public readonly classname = CompiledParameterExpression.name

  public readonly expression: CompiledExpression

  /**
   * @param jql [ParameterExpression]
   * @param options [ICompileOptions]
   */
  constructor(private readonly jql: ParameterExpression, options: ICompileOptions) {
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
