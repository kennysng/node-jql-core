import { AndExpressions, OrExpressions, Type } from 'node-jql'
import { CompiledConditionalExpression, CompiledExpression } from '.'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICursor } from '../../core/cursor'
import { ICompilingQueryOptions } from '../compiledSql'
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
  public async evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: boolean, type: Type }> {
    for (const expression of this.expressions) {
      const { value: result } = await expression.evaluate(cursor, sandbox)
      if (this.operator === 'AND' && !result) return { value: false, type: 'boolean' }
      if (this.operator === 'OR' && result) return { value: true, type: 'boolean' }
    }
    return { value: this.operator === 'AND', type: 'boolean' }
  }
}
