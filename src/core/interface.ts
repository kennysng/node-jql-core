import { IJQL } from 'node-jql'
import { InMemoryDatabaseEngine } from '../memoryEngine'
import { MemoryColumn } from '../memoryEngine/table'
import { DatabaseEngine } from './engine'

/**
 * Application options
 */
export interface IApplicationOptions {
  /**
   * Default engine used when creating database if not specified
   */
  defaultEngine?: DatabaseEngine

  /**
   * Default in-memory engine used
   */
  defaultInMemoryEngine?: InMemoryDatabaseEngine
}

/**
 * Base result structure
 */
export interface IResult {
  /**
   * Related JQL
   */
  jql?: IJQL

  /**
   * Time used
   */
  time: number
}

/**
 * Result structure of CREATE, INSERT or UPDATE
 */
export interface IUpdateResult extends IResult {
  count: number
}

/**
 * Result structure of a prediction
 */
export interface IPredictResult extends IResult {
  columns: MemoryColumn[]
}

/**
 * Result structure of SELECT
 */
export interface IQueryResult extends IResult {
  /**
   * Result
   */
  rows: any[]

  /**
   * Result structure
   */
  columns: MemoryColumn[]
}
