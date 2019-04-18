import { ICursor } from '.'
import { CursorError } from '../../../utils/error/CursorError'
import { TableCursor } from './table'

export class TablesCursor implements ICursor {
  private movedToFirst = false

  constructor(private readonly cursors: TableCursor[]) {
  }

  // @override
  public get(key: string): any {
    if (!this.movedToFirst) throw new CursorError('The Cursor is not ready')
    let error: Error|undefined
    for (const cursor of this.cursors) {
      try {
        return cursor.get(key)
      }
      catch (e) {
        if (!error) error = e
      }
    }
    throw error
  }

  // @override
  public next(): Promise<TablesCursor> {
    if (!this.movedToFirst) {
      return Promise.all(this.cursors.map(cursor => cursor.moveToFirst()))
        .then(() => {
          this.movedToFirst = true
          return this
        })
    }
    else {
      return this.next_(this.cursors.length - 1)
    }
  }

  private next_(i: number): Promise<TablesCursor> {
    return new Promise((resolve, reject) => {
      this.cursors[i].next()
        .then(() => this)
        .catch(() => {
          if (i === 0) return reject(new CursorError('The Cursor has reached the end'))
          resolve(this.cursors[i - 1].moveToFirst().then(() => this.next_(i - 1)))
        })
    })
  }
}
