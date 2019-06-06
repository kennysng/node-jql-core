import { BetweenExpression, Type } from 'node-jql'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { CompiledConditionalExpression, CompiledExpression } from '../expression'
import { Sandbox } from '../sandbox'
import { compile } from './compile'

export class CompiledBetweenExpression extends CompiledConditionalExpression {
  public readonly left: CompiledExpression
  public readonly start: CompiledExpression
  public readonly end: CompiledExpression

  constructor(private readonly expression: BetweenExpression, options: ICompilingQueryOptions) {
    super(expression)
    try {
      this.left = compile(expression.left, options)
      this.start = compile(expression.start, options)
      this.end = compile(expression.end, options)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile BetweenExpression', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledBetweenExpression'
  }

  get $not(): boolean {
    return this.expression.$not || false
  }

  get aggregateRequired(): boolean {
    return this.left.aggregateRequired || this.start.aggregateRequired || this.end.aggregateRequired
  }

  // @override
  public equals(obj: CompiledBetweenExpression): boolean {
    return this === obj || (
      this.$not === obj.$not &&
      this.left.equals(obj.left) &&
      this.start.equals(obj.start) &&
      this.end.equals(obj.end)
    )
  }

  // @override
  public async evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: boolean, type: Type }> {
    const promises = [this.left.evaluate(cursor, sandbox), this.start.evaluate(cursor, sandbox), this.end.evaluate(cursor, sandbox)]
    const [{ value: left }, { value: start }, { value: end }] = await Promise.all(promises)
    let value = start <= left && left <= end
    if (this.$not) value = !value
    return { value, type: 'boolean' }
  }
}
