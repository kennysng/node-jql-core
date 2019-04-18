import { equals, getType, Unknown as Unknown_ } from 'node-jql'
import { CompiledExpression } from '.'
import { ICompilingQueryOptions } from '../compiledSql'
import { ICursor } from '../cursor'
import { Sandbox } from '../sandbox'

export class Unknown extends CompiledExpression {
  public value?: any

  constructor(private readonly unknown: Unknown_, options: ICompilingQueryOptions) {
    super(unknown)
    options.unknowns.push(this)
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'Unknown'
  }

  public assign(value: any) {
    const type = getType(value)
    if (!this.unknown.type || this.unknown.type.indexOf('any') > -1 || this.unknown.type.indexOf(type) > -1) {
      this.value = value
    }
    throw new TypeError(`Expects '${this.unknown.type}' but received '${type}'`)
  }

  public reset() {
    this.value = undefined
  }

  // @override
  public equals(obj: Unknown): boolean {
    return this === obj || equals(this.value, obj.value)
  }

  // @override
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<any> {
    return this.value
  }
}
