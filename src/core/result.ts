import { IJQL } from 'node-jql'
import { ArrayCursor, Cursor } from '../memoryEngine/cursor'
import { Column } from '../memoryEngine/table'
import { NotFoundError } from '../utils/error/NotFoundError'

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
  columns?: Column[]
}

/**
 * Handle query result
 */
export class Resultset extends ArrayCursor {
  /**
   * @param result [IQueryResult]
   */
  constructor(private readonly result: IQueryResult) {
    super(result.rows)
  }

  // @override
  public async get<T = any>(key: string): Promise<T|undefined> {
    if (this.result.columns) {
      const column = this.result.columns.find(({ name }) => key === name)
      if (!column) throw new NotFoundError(`Key not found in cursor: ${key}`)
      key = column.id
    }
    return super.get(key)
  }

  /**
   * Do auto-mapping
   */
  public toArray(): string[] {
    if (!this.result.columns) return this.array
    const columns = this.result.columns
    return this.array.map(row => {
      const row_ = {} as any
      for (const { id, name } of columns) row_[name] = row[id]
      return row_
    })
  }
}
