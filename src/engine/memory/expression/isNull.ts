import { IsNullExpression, Type } from 'node-jql'
import { CompiledConditionalExpression, CompiledExpression } from '.'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import isUndefined from '../../../utils/isUndefined'
import { ICursor } from '../../core/cursor'
import { ICompilingQueryOptions } from '../compiledSql'
import { Sandbox } from '../sandbox'
import { compile } from './compile'

export class CompiledIsNullExpression extends CompiledConditionalExpression {
  public readonly left: CompiledExpression

  constructor(private readonly expression: IsNullExpression, options: ICompilingQueryOptions) {
    super(expression)
    try {
      this.left = compile(expression.left, options)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile CompiledIsNullExpression', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledIsNullExpression'
  }

  get $not(): boolean {
    return this.expression.$not || false
  }

  get aggregateRequired(): boolean {
    return this.left.aggregateRequired
  }

  // @override
  public equals(obj: CompiledIsNullExpression): boolean {
    return this === obj || (
      this.$not === obj.$not &&
      this.left.equals(obj.left)
    )
  }

  // @override
  public async evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: boolean, type: Type }> {
    const { value: left } = await this.left.evaluate(cursor, sandbox)
    let value = isUndefined(left)
    if (this.$not) value = !value
    return { value, type: 'boolean' }
  }
}
