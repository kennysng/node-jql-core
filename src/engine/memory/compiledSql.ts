import { Sql } from 'node-jql'
import { IDatabaseOptions } from '../../core'
import { Functions } from '../../function/functions'
import { Schema } from '../../schema'
import { CompiledExpression } from './expression'
import { CompiledColumnExpression } from './expression/column'
import { CompiledFunctionExpression } from './expression/function'
import { Unknown } from './expression/unknown'
import { CompiledTableOrSubquery } from './query/tableOrSubquery'

export interface IExpressionWithKey<T = CompiledExpression> {
  readonly expression: T
  readonly key: string
}

/**
 * Parameters required for compiling SQLs
 */
export interface ICompilingOptions {
  // Database options
  databaseOptions?: IDatabaseOptions

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

  // list of columns
  columns: CompiledColumnExpression[]

  // list of aggregate functions
  aggregateFunctions: CompiledFunctionExpression[]

  // list of unknowns
  unknowns: Unknown[]
}

/**
 * Check whether the object is ICompilingOptions
 * @param obj [ICompilingOptions]
 */
export function isICompilingQueryOptions(obj: ICompilingOptions): obj is ICompilingQueryOptions {
  return 'aliases' in obj && 'tables' in obj && 'columns' in obj && 'unknowns' in obj
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
