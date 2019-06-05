import { equals, normalize, Type, Value as Value_ } from 'node-jql'
import { CompiledExpression } from '../expression'

export class Value extends CompiledExpression {
  public readonly aggregateRequired = false

  constructor(private readonly value_: Value_) {
    super(value_)
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'Value'
  }

  get type(): Type {
    return this.value_.type
  }

  get value(): any {
    return this.value_.value
  }

  // @override
  public equals(obj: Value): boolean {
    return this === obj || (
      this.type === obj.type &&
      equals(this.value, obj.value)
    )
  }

  // @override
  public async evaluate(): Promise<{ value: any, type: Type }> {
    return { value: normalize(this.value), type: this.type }
  }
}
