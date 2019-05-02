import isRegexp = require('is-regexp')
import { LikeExpression, Type, Unknown as Unknown_ } from 'node-jql'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { CompiledConditionalExpression, CompiledExpression } from '../expression'
import { Sandbox } from '../sandbox'
import { compile } from './compile'
import { Unknown } from './unknown'

export class CompiledLikeExpression extends CompiledConditionalExpression {
  public readonly left: CompiledExpression
  public readonly right: RegExp|Unknown

  constructor(private readonly expression: LikeExpression, options: ICompilingQueryOptions) {
    super(expression)
    try {
      this.left = compile(expression.left, options)
      if (typeof expression.right === 'string') {
        this.right = new RegExp(expression.right)
      }
      else {
        this.right = new Unknown(expression.right, options)
        options.unknowns.push(this.right)
      }
    }
    catch (e) {
      throw new InstantiateError('Fail to compile LikeExpression', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledLikeExpression'
  }

  get $not(): boolean {
    return this.expression.$not || false
  }

  get aggregateRequired(): boolean {
    return this.left.aggregateRequired
  }

  // @override
  public equals(obj: CompiledLikeExpression): boolean {
    if (this === obj) return true
    if (this.$not !== obj.$not || !this.left.equals(obj.left)) return false
    if (isRegexp(this.right) && isRegexp(obj.right)) return String(this.right) === String(obj.right)
    return this.right instanceof Unknown && obj.right instanceof Unknown && this.right.equals(obj.right)
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: boolean, type: Type }> {
    return this.left.evaluate(cursor, sandbox)
      .then(({ value: left }) => {
        let right = this.right
        if (right instanceof Unknown) {
          right = new RegExp(right.value as string)
        }
        let value = right.test(left)
        if (this.$not) value = !value
        return { value, type: 'boolean' }
      })
  }
}
