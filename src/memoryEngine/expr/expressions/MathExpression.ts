import { IMathExpression, MathExpression, MathOperator } from 'node-jql'
import squel = require('squel')
import { CompiledExpression } from '..'
import { Cursor } from '../../cursor'
import { ICompileOptions } from '../../interface'
import { Sandbox } from '../../sandbox'
import { compile } from '../compile'

/**
 * Analyze MathExpression
 */
export class CompiledMathExpression extends CompiledExpression implements IMathExpression {
  public readonly classname = CompiledMathExpression.name
  public readonly type = 'number'

  public readonly left: CompiledExpression
  public readonly right: CompiledExpression

  /**
   * @param jql [MathExpression]
   * @param options [ICompileOptions]
   */
  constructor(private readonly jql: MathExpression, options: ICompileOptions) {
    super()
    this.left = compile(jql.left, options)
    this.right = compile(jql.right, options)
  }

  // @override
  get operator(): MathOperator {
    return this.jql.operator
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
  public toJson(): IMathExpression {
    return this.jql.toJson()
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<number> {
    const [left, right] = await Promise.all([
      this.left.evaluate(sandbox, cursor),
      this.right.evaluate(sandbox, cursor),
    ])
    if (typeof left === 'number' && typeof right === 'number') {
      switch (this.operator) {
        case '%':
        case 'MOD':
          return right === 0 ? NaN : left % right
        case '*':
          return left * right
        case '+':
          return left + right
        case '-':
          return left - right
        case '/':
          return right === 0 ? NaN : left / right
        case 'DIV':
          return right === 0 ? NaN : Math.floor(left / right)
      }
    }
    return NaN
  }
}
