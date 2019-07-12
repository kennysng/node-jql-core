import { IUnknown, Type, type, Unknown as NodeJQLUnknown } from 'node-jql'
import squel = require('squel')
import { CompiledExpression } from '..'
import { InMemoryError } from '../../../utils/error/InMemoryError'
import { Cursor } from '../../cursor'
import { Sandbox } from '../../sandbox'
import { ICompileOptions } from '../compile'

/**
 * Analyze Unknown
 */
export class Unknown extends CompiledExpression implements IUnknown {
  public readonly classname = Unknown.name

  /**
   * @param jql [NodeJQLUnknown]
   * @param options [ICompileOptions]
   */
  constructor(protected readonly jql: NodeJQLUnknown, options: ICompileOptions) {
    super()
  }

  // @override
  get type(): Type {
    const type_ = type(this.jql.value)
    const types = this.jql.type.filter(t => t === type_ || t === 'any')
    const result = types.length > 1 ? types.find(t => t !== 'any') : types[0]
    if (!result) throw new InMemoryError(`Unknown expects ${this.jql.type} but received ${type_}`)
    return result
  }

  // @override
  get value(): any {
    return this.jql.value
  }

  // @override
  public validate(): void {
    this.jql.validate()
  }

  // @override
  public toSquel(): squel.FunctionBlock {
    return this.jql.toSquel()
  }

  // @override
  public toJson(): IUnknown {
    return this.jql.toJson()
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<boolean> {
    return this.value
  }
}
