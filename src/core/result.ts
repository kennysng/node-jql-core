import { IJQL } from 'node-jql'
import { Column } from '../memoryEngine/table'

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
  columns: Column[]
}
