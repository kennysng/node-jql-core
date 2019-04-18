import { FunctionExpression } from 'node-jql'
import { CompiledExpression } from '.'
import { JQLAggregateFunction, JQLFunction } from '../../../function'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { Sandbox } from '../sandbox'
import { compile } from './compile'

export class CompiledFunctionExpression extends CompiledExpression {
  public parameters: CompiledExpression[]

  constructor(private readonly expression: FunctionExpression, private readonly options: ICompilingQueryOptions) {
    super(expression)
    try {
      this.parameters = this.jqlFunction
        .preprocess(expression.extra || '', expression.parameters)
        .map(parameter => compile(parameter, options))
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

  get extra(): string|undefined {
    return this.expression.extra
  }

  // @override
  public equals(obj: CompiledFunctionExpression): boolean {
    if (this === obj) return true
    if (this.expression.name !== obj.expression.name || this.extra !== obj.extra) return false
    if (this.parameters.length !== obj.parameters.length) return false
    for (const expression_ of this.parameters) {
      if (!obj.parameters.find(e => expression_.equals(e))) return false
    }
    return true
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<any> {
    const fn = this.jqlFunction
    // TODO
    return Promise.resolve()
  }
}
