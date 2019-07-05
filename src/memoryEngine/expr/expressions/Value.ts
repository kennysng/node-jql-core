import { IValue } from 'node-jql'
import { Unknown } from './Unknown'

/**
 * Analyze Value
 */
export class Value extends Unknown implements IValue {
  public readonly classname = Value.name

  // @override
  public toJson(): IValue {
    return this.jql.toJson() as IValue
  }
}
