import { equals, Type, Value as Value_ } from 'node-jql'
import { CompiledExpression } from '.'
import { ICursor } from '../cursor'
import { Sandbox } from '../sandbox'

export class Value extends CompiledExpression {
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
  public evaluate(cursor: ICursor, sandbox: Sandbox): Promise<any> {
    return this.value
  }
}
