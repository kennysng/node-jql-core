import { ICursor } from '.'
import { IRow } from '../../../core/interfaces'
import { CursorReachEndError } from '../../../utils/error/CursorReachEndError'

export class RowsCursor implements ICursor {
  protected currentIndex = -1

  constructor(protected readonly rows: IRow[]) {
  }

  // @override
  public moveToFirst(): Promise<RowsCursor> {
    this.currentIndex = -1
    return this.next()
  }

  // @override
  public async get(key: string): Promise<any> {
    return this.rows[this.currentIndex][key]
  }

  // @override
  public async next(): Promise<RowsCursor> {
    let index = this.currentIndex  + 1
    index = this.currentIndex = Math.max(-1, Math.min(index, this.rows.length))
    if (index < 0 || index >= this.rows.length) throw new CursorReachEndError()
    return this
  }
}
