import { denormalize, InExpression, Query, Type } from 'node-jql'
import { TEMP_DB_KEY } from '../../../core'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { CompiledConditionalExpression, CompiledExpression } from '../expression'
import { CompiledQuery } from '../query'
import { Sandbox } from '../sandbox'
import { compile } from './compile'
import { Unknown } from './unknown'

export class CompiledInExpression extends CompiledConditionalExpression {
  public readonly left: CompiledExpression
  public readonly right: CompiledExpression|CompiledQuery
  private tableKey?: string

  constructor(private readonly expression: InExpression, options: ICompilingQueryOptions) {
    super(expression)
    try {
      this.left = compile(expression.left, options)
      if (expression.right instanceof Query) {
        this.right = new CompiledQuery(expression.right, options)
        options.unknowns.push(...this.right.unknowns)
      }
      else {
        this.right = compile(expression.right, options)
        if (this.right instanceof Unknown) options.unknowns.push(this.right)
      }
    }
    catch (e) {
      throw new InstantiateError('Fail to compile CompiledInExpression', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledInExpression'
  }

  get $not(): boolean {
    return this.expression.$not || false
  }

  get aggregateRequired(): boolean {
    return this.left.aggregateRequired
  }

  set tempTable(key: string) {
    this.tableKey = key
  }

  // @override
  public equals(obj: CompiledInExpression): boolean {
    if (this === obj) return true
    if (this.$not !== obj.$not || !this.left.equals(obj.left)) return false
    if (this.right instanceof CompiledQuery && obj.right instanceof CompiledQuery) return this.right.equals(obj.right)
    return (this.right as CompiledExpression).equals(obj.right as CompiledExpression)
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: boolean, type: Type }> {
    return Promise.all([this.left.evaluate(cursor, sandbox), this.evaluateRight(cursor, sandbox)])
      .then(([{ value: left }, { value: right }]) => {
        const value = denormalize(right, 'Array').indexOf(left) > -1
        return { value, type: 'boolean' }
      })
  }

  private evaluateRight(cursor: ICursor, sandbox: Sandbox): Promise<{ value: any, type: Type }> {
    if (this.right instanceof CompiledQuery) {
      const promise = this.tableKey ? sandbox.getContext(TEMP_DB_KEY, this.tableKey) : sandbox.run(this.right, { cursor }).then(({ data }) => data)
      return promise.then(data => ({ value: data, type: 'Array' }))
    }
    else {
      return this.right.evaluate(cursor, sandbox)
    }
  }
}
