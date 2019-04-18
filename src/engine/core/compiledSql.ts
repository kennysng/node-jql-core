import { Sql } from 'node-jql'
import squel = require('squel')
import { Functions } from '../../function/functions'
import { Schema } from '../../schema'
import { Table } from '../../schema/table'
import { Unknown } from './expression/unknown'

/**
 * Compiled Table information
 */
export interface ITableInfo {
  database: string
  name?: string
  key: string
  tempTable?: Table
}

/**
 * Parameters required for compiling SQLs
 */
export interface ICompilingOptions {
  defaultDatabase?: string
  functions: Functions
  schema: Schema
}

/**
 * Parameters required for compiling queries
 */
export interface ICompilingQueryOptions extends ICompilingOptions {
  aliases: { [key: string]: string }
  tables: ITableInfo[]
  unknowns: Unknown[]
}

/**
 * Check whether the object is ICompilingOptions
 * @param obj [ICompilingOptions]
 */
export function isICompilingQueryOptions(obj: ICompilingOptions): obj is ICompilingQueryOptions {
  return 'aliases' in obj && 'tables' in obj && 'unknowns' in obj
}

/**
 * Compiled SQL statement, which should be optimized
 */
export abstract class CompiledSql {
  constructor(protected readonly sql: Sql) {
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledSql'
  }

  /**
   * Get squel instance
   */
  public toSquel(): squel.BaseBuilder {
    return this.sql.toSquel()
  }

  // @override
  public toString(): string {
    return this.sql.toString()
  }

  /**
   * Check whether the two CompiledSql instances are the same
   * @param sql [CompiledSql]
   */
  public abstract equals(sql: CompiledSql): boolean
}
