import { Case, CaseExpression, Type } from 'node-jql'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { CompiledConditionalExpression, CompiledExpression } from '../expression'
import { Sandbox } from '../sandbox'
import { compile } from './compile'

export class CompiledCase {
  public readonly $when: CompiledConditionalExpression
  public readonly $then: CompiledExpression

  constructor(private readonly case_: Case, options: ICompilingQueryOptions) {
    try {
      this.$when = compile(case_.$when, options) as CompiledConditionalExpression
      this.$then = compile(case_.$then, options)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile Case', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledCase'
  }

  public equals(obj: CompiledCase): boolean {
    return this === obj || (
      this.$when.equals(obj.$when) &&
      this.$then.equals(obj.$then)
    )
  }
}

export class CompiledCaseExpression extends CompiledExpression {
  public readonly cases: CompiledCase[]
  public readonly $else?: CompiledExpression

  constructor(private readonly expression: CaseExpression, options: ICompilingQueryOptions) {
    super(expression)
    try {
      this.cases = expression.cases.map(case_ => new CompiledCase(case_, options))
      if (expression.$else) this.$else = compile(expression, options)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile CaseExpression', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledCaseExpression'
  }

  // @override
  public equals(obj: CompiledCaseExpression): boolean {
    if (this === obj) return true
    if (this.cases.length !== obj.cases.length) return false
    for (const case_ of this.cases) {
      if (!obj.cases.find(c => case_.equals(c))) return false
    }
    if (!this.$else && !obj.$else) return true
    return (this.$else && obj.$else && this.$else.equals(obj.$else)) || false
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: any, type: Type }> {
    return this.evaluate_(0, cursor, sandbox)
  }

  private evaluate_(i: number, cursor: ICursor, sandbox: Sandbox): Promise<{ value: any, type: Type }> {
    return new Promise(resolve => {
      const { $when, $then } = this.cases[i]
      $when.evaluate(cursor, sandbox)
        .then(result => {
          if (result) {
            return resolve($then.evaluate(cursor, sandbox))
          }
          else if (i + 1 < this.cases.length) {
            return resolve(this.evaluate_(i + 1, cursor, sandbox))
          }
          else {
            return resolve(this.$else ? this.$else.evaluate(cursor, sandbox) : undefined)
          }
        })
    })
  }
}
