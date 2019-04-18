import _ = require('lodash')
import moment = require('moment')
import { defaults, Type } from 'node-jql'
import uuid = require('uuid/v4')
import { InstantiateError } from '../utils/error/InstantiateError'
import { isUndefined } from '../utils/isUndefined'
import { Table } from './table'

/**
 * Extra properties for Column
 */
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
  public readonly tableKey?: string

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
   * Create a clean Column with a given key
   * @param name [string]
   * @param type [Type]
   * @param key [string]
   * @param options [IColumnOptions]
   */
  constructor(name: string, type: Type, key: string, options?: IColumnOptions)

  /**
   * Bind a Column to a Table, or unbind a Column
   * @param column [Column]
   * @param table [Table]
   */
  constructor(column: Column, table?: Table)

  constructor(...args: any[]) {
    try {
      let name: string, type: Type, key: string, options: IColumnOptions
      if (args[0] instanceof Column) {
        const column = args[0] as Column
        name = column.name
        type = column.type
        options = column
        if (args[1]) this.tableKey = (args[1] as Table).key
      }
      else {
        name = args[0]
        type = args[1]
      }
      if (typeof args[2] === 'string') {
        key = args[2] || uuid()
        options = args[3] || {}
      }
      else {
        key = uuid()
        options = args[2] || {}
      }

      this.name = name
      this.type = type
      this.key = key
      if (isUndefined(options.default)) options.default = defaults[type]
      Object.assign(this, options)

      if (!this.nullable && isUndefined(this.default)) {
        throw new TypeError(`Column '${name}' is not nullable but no default value is assigned`)
      }
    }
    catch (e) {
      throw new InstantiateError('Fail to instantiate Column', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'Column'
  }

  /**
   * Check whether the Column is binded to a Table
   */
  get isBinded(): boolean {
    return !!this.tableKey
  }

  /**
   * Get SQL string of the Column
   */
  get sql(): string {
    return `\`${this.name}\` ${this.type}${this.nullable ? '' : ' NOT NULL'}${!isUndefined(this.default) ? ` DEFAULT ${JSON.stringify(this.default)}` : ''}`
  }

  /**
   * Check whether the provided value is suitable to this Column
   * @param value [any] inserted value
   */
  public validate(value: any): any {
    if (isUndefined(value) && !isUndefined(this.default)) value = _.cloneDeep(this.default)
    if (!this.nullable && isUndefined(value)) throw new TypeError(`Column '${this.name}' is not nullable but received undefined`)
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
    return value
  }

  /**
   * Check whether the two Column instances are the same
   * @param column [Column]
   */
  public equals(column: Column): boolean {
    return this === column || this.key === column.key
  }
}
