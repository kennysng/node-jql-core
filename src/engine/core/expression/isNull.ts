import { IsNullExpression, Type } from 'node-jql'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { isUndefined } from '../../../utils/isUndefined'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { CompiledConditionalExpression, CompiledExpression } from '../expression'
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

  // @override
  public equals(obj: CompiledIsNullExpression): boolean {
    return this === obj || (
      this.$not === obj.$not &&
      this.left.equals(obj.left)
    )
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: boolean, type: Type }> {
    return this.left.evaluate(cursor, sandbox)
      .then(({ value: left }) => {
        let value = isUndefined(left)
        if (this.$not) value = !value
        return { value, type: 'boolean' }
      })
  }
}
