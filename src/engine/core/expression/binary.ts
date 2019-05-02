import _ = require('lodash')
import { BinaryExpression, BinaryOperator, Type } from 'node-jql'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { CompiledConditionalExpression, CompiledExpression } from '../expression'
import { Sandbox } from '../sandbox'
import { compile } from './compile'

export class CompiledBinaryExpression extends CompiledConditionalExpression {
  public readonly left: CompiledExpression
  public readonly right: CompiledExpression

  constructor(private readonly expression: BinaryExpression, options: ICompilingQueryOptions) {
    super(expression)
    try {
      this.left = compile(expression.left, options)
      this.right = compile(expression.right, options)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile BinaryExpression', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledBinaryExpression'
  }

  get operator(): BinaryOperator {
    return this.expression.operator
  }

  get aggregateRequired(): boolean {
    return this.left.aggregateRequired || this.right.aggregateRequired
  }

  // @override
  public equals(obj: CompiledBinaryExpression): boolean {
    return this === obj || (
      this.operator === obj.operator &&
      this.left.equals(obj.left) &&
      this.right.equals(obj.right)
    )
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: boolean, type: Type }> {
    return Promise.all([this.left.evaluate(cursor, sandbox), this.right.evaluate(cursor, sandbox)])
      .then(([{ value: left }, { value: right }]) => {
        let value: boolean = false
        switch (this.operator) {
          case '<':
            value = left < right
            break
          case '<=':
            value = left < right || _.isEqual(left, right)
            break
          case '<>':
            value = !_.isEqual(left, right)
            break
          case '=':
            value = _.isEqual(left, right)
            break
          case '>':
            value = left > right
            break
          case '>=':
            value = left > right || _.isEqual(left, right)
            break
        }
        return { value, type: 'boolean' }
      })
  }
}
