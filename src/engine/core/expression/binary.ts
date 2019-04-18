import _ = require('lodash')
import { BinaryExpression, BinaryOperator } from 'node-jql'
import { CompiledConditionalExpression, CompiledExpression } from '.'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { Sandbox } from '../sandbox'
import { compile } from './compile'

export class CompiledBinaryExpression extends CompiledConditionalExpression {
  public readonly left: CompiledExpression
  public readonly right: CompiledExpression

  constructor(private readonly expression: BinaryExpression, options: ICompilingQueryOptions) {
    super(expression)
    try {
      this.left = compile(expression.left, options)
      this.right = compile(expression.left, options)
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

  // @override
  public equals(obj: CompiledBinaryExpression): boolean {
    return this === obj || (
      this.operator === obj.operator &&
      this.left.equals(obj.left) &&
      this.right.equals(obj.right)
    )
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<boolean> {
    return Promise.all([this.left.evaluate(cursor, sandbox), this.right.evaluate(cursor, sandbox)])
      .then(([left, right]) => {
        switch (this.operator) {
          case '<':
            return left < right
          case '<=':
            return left < right || _.isEqual(left, right)
          case '<>':
            return !_.isEqual(left, right)
          case '=':
            return _.isEqual(left, right)
          case '>':
            return left > right
          case '>=':
            return left > right || _.isEqual(left, right)
          default:
            return false
        }
      })
  }
}
