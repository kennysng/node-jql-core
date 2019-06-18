import { Type } from 'node-jql'

/**
 * Represent Table row
 */
export interface IRow {
  [key: string]: any
}

/**
 * Represet Database structure
 */
export interface IDataSource {
  [key: string]: {
    [key: string]: IRow[],
  }
}

/**
 * Represent request result
 */
export interface IResult {
  time: number
  sql?: string
}

/**
 * Represent mapping information for the Query result
 */
export interface IMapping {
  table?: string
  column?: string
  name: string
  key: string
}

/**
 * Represent Query result
 */
export interface IQueryResult extends IResult {
  mappings: IMapping[],
  data: IRow[]
}

export interface IPredictResult extends IResult {
  columns: Array<{ name: string, type: Type }>
}
