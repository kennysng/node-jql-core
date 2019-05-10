import { FunctionExpression, Type } from 'node-jql'
import uuid = require('uuid')
import { CompiledExpression } from '.'
import { JQLAggregateFunction, JQLFunction } from '../../../function'
import { CursorReachEndError } from '../../../utils/error/CursorReachEndError'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import isUndefined from '../../../utils/isUndefined'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { Sandbox } from '../sandbox'
import { compile } from './compile'
import { CompiledParameterExpression } from './parameter'

export class CompiledFunctionExpression extends CompiledExpression {
  public parameters: CompiledParameterExpression[]
  public readonly key: string = uuid()

  constructor(private readonly expression: FunctionExpression, private readonly options: ICompilingQueryOptions) {
    super(expression)
    try {
      this.parameters = this.jqlFunction
        .preprocess(expression.parameters)
        .map(parameter => compile(parameter, options) as CompiledParameterExpression)
      if (this.aggregateRequired && this.parameters.find(expression => expression.aggregateRequired)) throw new SyntaxError(`Invalid use of aggregate function '${this.expression.name}(expression)'`)
      if (this.jqlFunction instanceof JQLAggregateFunction) this.options.aggregateFunctions.push(this)
    }
    catch (e) {
      throw new InstantiateError('Fail to compile FunctionExpression', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledFunctionExpression'
  }

  get jqlFunction(): JQLFunction {
    return this.options.functions.get(this.expression.name)
  }

  get aggregateRequired(): boolean {
    return this.jqlFunction instanceof JQLAggregateFunction
  }

  // @override
  public equals(obj: CompiledFunctionExpression): boolean {
    if (this === obj) return true
    if (this.expression.name !== obj.expression.name) return false
    if (this.parameters.length !== obj.parameters.length) return false
    for (const expression_ of this.parameters) {
      if (!obj.parameters.find(e => expression_.equals(e))) return false
    }
    return true
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<{ value: any, type: Type }> {
    const fn = this.jqlFunction
    const value = cursor.get(this.key)
    const promise = isUndefined(value)
      ? (
        fn instanceof JQLAggregateFunction
          ? this.traverseCursor(cursor, sandbox, this.parameters[0])
          : Promise.all(this.parameters.map(parameter => parameter.evaluate(cursor, sandbox)))
            .then(results => results.map(result => result.value))
      )
        .then(args => fn.run(...args))
      : Promise.resolve(value)
    return promise.then(value => ({ value, type: fn.type }))
  }

  public traverseCursor(cursor: ICursor, sandbox: Sandbox, expression: CompiledExpression, movedToFirst = false, result: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      (movedToFirst ? cursor.next() : cursor.moveToFirst())
        .then(cursor => resolve(
          expression.evaluate(cursor, sandbox)
            .then(({ value }) => result.push(value))
            .then(() => this.traverseCursor(cursor, sandbox, expression, true, result)),
        ))
        .catch(e => {
          return e instanceof CursorReachEndError ? resolve(result) : reject(e)
        })
    })
  }
}
