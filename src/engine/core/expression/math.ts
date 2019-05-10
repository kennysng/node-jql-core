import { MathExpression, MathOperator, Type } from 'node-jql'
import { CompiledExpression } from '.'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { Sandbox } from '../sandbox'
import { compile } from './compile'

export class CompiledMathExpression extends CompiledExpression {
  public readonly left: CompiledExpression
  public readonly right: CompiledExpression

  constructor(private readonly expression: MathExpression, options: ICompilingQueryOptions) {
    super(expression)
    try {
      this.left = compile(expression.left, options)
      this.right = compile(expression.right, options)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile MathExpression', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledMathExpression'
  }

  get operator(): MathOperator {
    return this.expression.operator
  }

  get aggregateRequired(): boolean {
    return this.left.aggregateRequired || this.right.aggregateRequired
  }

  // @override
  public equals(obj: CompiledMathExpression): boolean {
    return this === obj || (
      this.operator === obj.operator &&
      this.left.equals(obj.left) &&
      this.right.equals(obj.right)
    )
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: number, type: Type }> {
    return Promise.all([this.left.evaluate(cursor, sandbox), this.right.evaluate(cursor, sandbox)])
      .then(([{ value: left }, { value: right }]) => {
        let value: number = 0
        switch (this.operator) {
          case '+':
            value = left + right
            break
          case '-':
            value = left - right
            break
          case '*':
            value = left * right
            break
          case '/':
            value = left / right
            break
          case '%':
          case 'MOD':
            value = left % right
            break
          case 'DIV':
            value = Math.floor(left / right)
            break
        }
        return { value, type: 'number' }
      })
  }
}
