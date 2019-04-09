import moment = require('moment')
import { Type } from 'node-jql'
import uuid = require('uuid/v4')
import { InstantiateError } from '../utils/error/InstantiateError'
import { TempTable } from './table'

export interface IColumnOptions {
  default?: any
  nullable?: boolean
}

/**
 * Define the properties of a Column
 */
export class Column implements IColumnOptions {
  public readonly name: string
  public readonly type: Type
  public readonly key: string
  public readonly table?: TempTable

  public readonly default: any
  public readonly nullable: boolean

  /**
   * Create a clean Column
   * @param name [string]
   * @param type [Type]
   * @param options [IColumnOptions]
   */
  constructor(name: string, type: Type, options?: IColumnOptions)

  /**
   * Create a clean Column with given key
   * @param name [string]
   * @param type [Type]
   * @param key [string]
   * @param options [IColumnOptions]
   */
  constructor(name: string, type: Type, key: string, options?: IColumnOptions)

  /**
   * Bind the Column to a Table
   * @param table [TempTable]
   * @param column [Column]
   */
  constructor(table: TempTable, column: Column)
  constructor(...args: any[]) {
    let name: string, type: Type, key: string, options: IColumnOptions = {}, table: TempTable|undefined
    switch (args.length) {
      case 2:
        if (typeof args[0] === 'string') {
          name = args[0]
          type = args[1]
        }
        else {
          table = args[0]
          const column: Column = options = args[1]
          name = column.name
          type = column.type
        }
        key = uuid()
        break
      case 3:
      case 4:
      default:
        name = args[0]
        type = args[1]
        key = typeof args[2] === 'string' ? args[2] : uuid()
        if (args[3]) options = args[3]
        break
    }

    this.name = name
    this.type = type
    this.key = key
    this.table = table

    if (!options.nullable && options.default === undefined) {
      throw new InstantiateError(`Column '${name}' is not nullable but no default value is assigned`)
    }
    this.default = options.default
    this.nullable = options.nullable || false
  }

  /**
   * Check whether the Column is binded to a Table
   */
  get binded(): boolean {
    return !!this.table
  }

  // @override
  get [Symbol.toStringTag]() {
    return 'Column'
  }

  /**
   * Check whether the provided value is suitable to this Column
   * @param value [any] inserted value
   */
  public validate(value: any) {
    if (!this.nullable && (value === undefined || value === null)) throw new TypeError(`Column '${this.name}' is not nullable but received undefined`)
    switch (this.type) {
      case 'any':
        // do nothing
        break
      case 'Date':
        if (!moment(value).isValid()) throw new TypeError(`Invalid date value '${value}' for Column '${this.name}'`)
        break
      case 'string':
      case 'number':
      case 'boolean':
      case 'object':
        const type = typeof value
        if (type !== this.type) throw new TypeError(`Column '${this.name}' expects '${this.type}' but received '${type}'`)
        break
    }
  }

  /**
   * Clone the Column
   */
  public clone(): Column {
    return new Column(this.name, this.type, this)
  }

  /**
   * Check whether the two Column instances are the same
   * @param column [Column]
   */
  public equals(column: Column): boolean {
    return this.name === column.name && this.key === column.key
  }

  // @override
  public toString(): string {
    return this.name
  }
}
