import { equals, getType, Type, Unknown as Unknown_ } from 'node-jql'
import { CompiledExpression } from '.'
import { ICompilingQueryOptions } from '../compiledSql'

export class Unknown extends CompiledExpression {
  public value?: any
  public type: Type = 'any'
  public readonly aggregateRequired = false

  constructor(private readonly unknown: Unknown_, options: ICompilingQueryOptions) {
    super(unknown)
    options.unknowns.push(this)
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'Unknown'
  }

  public assign(value: any): void {
    const type = getType(value)
    if (!this.unknown.type || this.unknown.type.indexOf('any') > -1 || this.unknown.type.indexOf(type) > -1) {
      this.value = this.unknown.value = value
      this.type = type
      return
    }
    throw new TypeError(`Expects '${this.unknown.type}' but received '${type}'`)
  }

  public reset(): void {
    this.value = undefined
  }

  // @override
  public equals(obj: Unknown): boolean {
    return this === obj || equals(this.value, obj.value)
  }

  // @override
  public async evaluate(): Promise<{ value: any, type: Type }> {
    return { value: this.value, type: this.type }
  }
}
