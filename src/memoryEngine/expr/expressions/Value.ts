import { IValue } from 'node-jql'
import { CompiledUnknown } from './Unknown'

/**
 * Analyze Value
 */
export class CompiledValue extends CompiledUnknown implements IValue {
  public readonly classname = CompiledValue.name

  // @override
  public toJson(): IValue {
    return this.jql.toJson() as IValue
  }
}
