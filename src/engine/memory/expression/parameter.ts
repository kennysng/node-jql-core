import { ParameterExpression, Type } from 'node-jql'
import { CompiledExpression } from '.'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { Sandbox } from '../sandbox'
import { compile } from './compile'

export class CompiledParameterExpression extends CompiledExpression {
  public readonly expression: CompiledExpression

  constructor(private readonly expression_: ParameterExpression, options: ICompilingQueryOptions) {
    super(expression_)
    try {
      this.expression = compile(expression_.expression, options)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile ParameterExpression', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledParameterExpression'
  }

  get prefix(): string|undefined {
    return this.expression_.prefix
  }

  get suffix(): string|undefined {
    return this.expression_.suffix
  }

  // @override
  public equals(obj: CompiledParameterExpression): boolean {
    return this === obj || (
      this.expression.equals(obj.expression) &&
      this.prefix === obj.prefix &&
      this.suffix === obj.suffix
    )
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: any, type: Type }> {
    return this.expression.evaluate(cursor, sandbox)
  }
}
