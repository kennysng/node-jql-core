import { Sql } from 'node-jql'
import { Functions } from '../../function/functions'
import { Schema } from '../../schema'
import { CompiledExpression } from './expression'
import { Unknown } from './expression/unknown'
import { CompiledTableOrSubquery } from './query/tableOrSubquery'

export interface IExpressionWithKey {
  readonly expression: CompiledExpression
  readonly key: string
}

/**
 * Parameters required for compiling SQLs
 */
export interface ICompilingOptions {
  // Default Database key
  defaultDatabase?: string

  // list of available functions
  functions: Functions

  // Database schema at this moment
  schema: Schema
}

/**
 * Parameters required for compiling queries
 */
export interface ICompilingQueryOptions extends ICompilingOptions {
  // alias-to-table mapping
  aliases: { [key: string]: string }

  // list of available Tables
  tables: CompiledTableOrSubquery[]

  // list of unknowns
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
