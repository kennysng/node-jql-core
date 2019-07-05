import { checkNull, Column as NodeJQLColumn, IColumn, ICreateTableJQL, Type, type } from 'node-jql'
import uuid = require('uuid/v4')
import { ReadWriteLock } from '../utils/lock'

/**
 * In-memory column in NodeJQL
 */
export class Column<Default = any> extends NodeJQLColumn<Type, Default> {
  public readonly id = uuid()

  public readonly name: string
  public readonly type: Type
  public readonly nullable: boolean
  public readonly defValue?: Default
  public readonly options?: string[]

  /**
   * @param json [IColumn<Type>]
   */
  constructor(json: IColumn<Type>)

  /**
   * @param name [string]
   * @param type [Type]
   * @param nullable [boolean] optional
   * @param options [Array<string>] optional
   */
  constructor(name: string, type: Type, nullable?: boolean, ...options: string[])

  /**
   * @param id [string]
   * @param name [string]
   * @param type [Type]
   * @param nullable [boolean] optional
   * @param options [Array<string>] optional
   */
  constructor(id: string, name: string, type: Type, nullable?: boolean, ...options: string[])

  constructor(...args: any[]) {
    super(
      typeof args[0] === 'object' ? args[0] : args[typeof args[2] === 'string' ? 1 : 0],
      args[typeof args[2] === 'string' ? 2 : 1],
      args[typeof args[2] === 'string' ? 3 : 2],
      ...args.slice(typeof args[2] === 'string' ? 4 : 3),
    )
    if (typeof args[2] === 'string') this.id = args[0]
  }

  /**
   * Validate column value
   * @param value [any]
   */
  public checkValue(value: any): any {
    if (checkNull(value)) {
      value = this.defValue
      if (checkNull(value) && !this.nullable) throw new TypeError(`Column ${this.name} is not nullable`)
    }

    switch (this.type) {
      case 'Array':
        if (!Array.isArray(value)) throw new TypeError(`Column ${this.name} expects Array but received ${type(value)}`)
        break
      case 'Date':
        if (!(value instanceof Date)) throw new TypeError(`Column ${this.name} expects Date but received ${type(value)}`)
        break
      case 'boolean':
      case 'number':
      case 'object':
      case 'string':
        if (typeof value !== this.type) throw new TypeError(`Column ${this.name} expects ${this.type} but received ${typeof value}`)
        break
      case 'any':
        break
    }
    return value
  }
}

/**
 * In-memory table
 */
export class Table implements ICreateTableJQL {
  public classname = Table.name

  /**
   * Table lock
   */
  public readonly lock = new ReadWriteLock(0, 1)

  public readonly $temporary: boolean
  public readonly name: string
  public readonly columns: Column[]
  public readonly constraints?: string[]
  public readonly options?: string[]

  /**
   * @param name [string]
   * @param columns [Array<NodeJQLColumn>]
   * @param constraints [Array<string>|string] optional
   * @param options [Array<string>] optional
   */
  constructor(name: string, columns: Array<NodeJQLColumn<Type>>, constraints?: string[]|string, ...options: string[])

  /**
   * @param $temporary [boolean]
   * @param name [string]
   * @param columns [Array<NodeJQLColumn>]
   * @param constraints [Array<string>|string] optional
   * @param options [Array<string>] optional
   */
  constructor($temporary: boolean, name: string, columns: Array<NodeJQLColumn<Type>>, constraints?: string[]|string, ...options: string[])

  constructor(...args: any[]) {
    // parse args
    let $temporary = false, name: string, columns: Array<NodeJQLColumn<Type>>, constraints: string[]|string|undefined, options: string[]
    if (typeof args[0] === 'boolean') {
      $temporary = args[0]
      name = args[1]
      columns = args[2]
      constraints = args[3]
      options = args.slice(4)
    }
    else {
      name = args[0]
      columns = args[1]
      constraints = args[2]
      options = args.slice(3)
    }

    // set args
    this.$temporary = $temporary
    this.name = name
    this.columns = columns.map(column => new Column(column.toJson()))
    if (constraints) this.constraints = Array.isArray(constraints) ? constraints : [constraints]
    if (options.length) this.options = options
  }
}
