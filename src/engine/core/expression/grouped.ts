import { AndExpressions, OrExpressions, Type } from 'node-jql'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { CompiledConditionalExpression, CompiledExpression } from '../expression'
import { Sandbox } from '../sandbox'
import { compile } from './compile'

export class CompiledGroupedExpressions extends CompiledConditionalExpression {
  public readonly expressions: CompiledExpression[]

  constructor(private readonly expression: AndExpressions|OrExpressions, options: ICompilingQueryOptions) {
    super(expression)
    try {
      this.expressions = expression.expressions.map(expression => compile(expression, options))
    }
    catch (e) {
      throw new InstantiateError('Fail to compile GroupedExpressions', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledGroupedExpressions'
  }

  get operator(): 'AND' | 'OR' {
    return this.expression instanceof AndExpressions ? 'AND' : 'OR'
  }

  get aggregateRequired(): boolean {
    return this.expressions.reduce<boolean>((result, expression) => result || expression.aggregateRequired, false)
  }

  // @override
  public equals(obj: CompiledGroupedExpressions): boolean {
    if (this === obj) return true
    if (this.expressions.length !== obj.expressions.length) return false
    for (const expression_ of this.expressions) {
      if (!obj.expressions.find(e => expression_.equals(e))) return false
    }
    return true
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: boolean, type: Type }> {
    return this.evaluate_(0, cursor, sandbox).then(value => ({ value, type: 'boolean' }))
  }

  private evaluate_(i: number, cursor: ICursor, sandbox: Sandbox): Promise<boolean> {
    return new Promise(resolve => {
      const expression = this.expressions[i]
      expression.evaluate(cursor, sandbox)
        .then(({ value: result }) => {
          if (this.operator === 'AND' && !result) {
            return resolve(false)
          }
          else if (this.operator === 'OR' && result) {
            return resolve(true)
          }
          else if (i + 1 < this.expressions.length) {
            return resolve(this.evaluate_(i + 1, cursor, sandbox))
          }
          else {
            return resolve(this.operator === 'AND' ? true : false)
          }
        })
    })
  }
}
