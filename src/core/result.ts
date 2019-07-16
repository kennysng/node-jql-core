import { ArrayCursor } from '../memoryEngine/cursor'
import { NotFoundError } from '../utils/error/NotFoundError'
import { IQueryResult } from './interface'

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
  public toArray(): any[] {
    if (!this.result.columns) return this.array
    const columns = this.result.columns
    return this.array.map(row => {
      const row_ = {} as any
      for (const { id, name } of columns) row_[name] = row[id]
      return row_
    })
  }
}
