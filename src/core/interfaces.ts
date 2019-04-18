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
}

/**
 * Represent Query result
 */
export interface IQueryResult extends IResult {
  data: IRow[]
}
