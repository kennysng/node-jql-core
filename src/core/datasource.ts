import _ = require('lodash')
import { Database } from '../schema/database'
import { Table } from '../schema/table'

/**
 * Represent a Table row
 */
export interface IDataRow {
  [key: string]: any
}

/**
 * Represent the structure of a Database
 */
export interface IDataSource {
  [key: string]: { // Database-level
    [key: string]: // Table-level
      IDataRow[],  // Table rows
  },
}

/**
 * Containing the data stored and variables defined
 */
export class DataSource {
  private context: IDataSource = {}
  private variables: { [key: string]: any } = {}

  constructor() {
    // TODO register built-in functions
  }

  // @override
  get [Symbol.toStringTag]() {
    return 'DataSource'
  }

  /**
   * Define variable with the given name
   * @param name [string]
   * @param value [T]
   */
  public set<T>(name: string, value: T)

  /**
   * Assign the content of the given Database
   * @param database [Database]
   * @param value [Object]
   */
  public set(database: Database, value: { [key: string]: IDataRow[] })

  /**
   * Assign the content of the given Table
   * @param database [Database]
   * @param table [Table]
   * @param value [Array<IDataRow>]
   */
  public set(database: Database, table: Table, value: IDataRow[])

  public set(...args: any[]) {
    if (typeof args[0] === 'string') {
      return this.variables[args[0] as string] = args[1]
    }

    let database: Database, table: Table|undefined, value: any
    switch (args.length) {
      case 2:
        database = args[0]
        value = args[1]
        break
      case 3:
      default:
        database = args[0]
        table = args[1]
        value = args[2]
        break
    }

    if (table) {
      if (!this.context[database.key]) this.context[database.key] = {}
      return this.context[database.key][table.key] = value
    }
    else {
      return this.context[database.key] = value
    }
  }

  /**
   * Remove the variable with the given name
   * @param variable [string]
   *
   * Remove the whole content of the given Database
   * @param variable [Database]
   */
  public remove(variableOrDatabase: string|Database)

  /**
   * Remove the whole content of the given Table
   * @param database [Database]
   * @param table [Table]
   */
  public remove(database: Database, table: Table)

  public remove(...args: any[]) {
    if (typeof args[0] === 'string') {
      return delete this.variables[args[0] as string]
    }

    let database: Database, table: Table|undefined
    switch (args.length) {
      case 1:
        database = args[0]
        break
      case 2:
        database = args[0]
        table = args[1]
        break
      case 3:
      default:
        database = args[0]
        table = args[1]
        break
    }

    if (table) {
      if (!this.context[database.key]) return
      return delete this.context[database.key][table.key]
    }
    else {
      return delete this.context[database.key]
    }
  }

  /**
   * Get the variable with the given name
   * @param name [string]
   */
  public get<T>(name: string): T

  /**
   * Get the whole content of the given Database
   * @param database [Database]
   */
  public get(database: Database): { [key: string]: IDataRow[] }

  /**
   * Get the whole content of the given Table
   * @param database [Database]
   * @param table [Table]
   */
  public get(database: Database, table: Table): IDataRow[]

  public get(...args: any[]): any {
    if (typeof args[0] === 'string') {
      return this.variables[args[0] as string]
    }

    let database: Database, table: Table|undefined
    switch (args.length) {
      case 1:
        database = args[0]
        break
      case 2:
      default:
        database = args[0]
        table = args[1]
        break
    }

    if (table) {
      if (!this.context[database.key]) return undefined
      return this.context[database.key][table.key]
    }
    else {
      return this.context[database.key]
    }
  }

  /**
   * Clone the content and variables from another DataSource
   * @param source [DataSource]
   */
  public cloneFrom(source: DataSource) {
    // clone deep to make sure they are 2 set of data source
    this.context = _.cloneDeep(source.context)

    // copy reference only
    this.variables = source.variables
  }
}
