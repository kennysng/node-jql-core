import { CursorReachEndError } from '../../../utils/error/CursorReachEndError'
import { isUndefined } from '../../../utils/isUndefined'

/**
 * Simulate Cursor in Java in order to reduce the memory usage
 */
export interface ICursor {
  /**
   * Move the cursor to the first row
   */
  moveToFirst(): Promise<ICursor>

  /**
   * Get the value of the given key from the current row
   * @param key [string]
   */
  get(key: string): any

  /**
   * Move to next column. Throw error if reaches the end
   */
  next(): Promise<ICursor>
}

/**
 * Joining multiple cursors
 */
export class Cursors implements ICursor {
  constructor(private readonly cursors: ICursor[], private readonly mode: '+'|'*' = '*') {
  }

  // @override
  public moveToFirst(): Promise<Cursors> {
    return Promise.all(this.cursors.map(cursor => cursor.moveToFirst()))
      .then(() => this)
  }

  // @override
  public get(key: string): any {
    let error: Error|undefined
    for (const cursor of this.cursors) {
      try {
        const value = cursor.get(key)
        if (!isUndefined(value)) return value
      }
      catch (e) {
        if (!error) error = e
      }
    }
    if (error) throw error
  }

  // @override
  public next(): Promise<Cursors> {
    switch (this.mode) {
      case '+':
        return this.plusNext()
      case '*':
      default:
        return this.timesNext(this.cursors.length - 1)
    }
  }

  private plusNext(i: number = 0): Promise<Cursors> {
    return new Promise((resolve, reject) => {
      this.cursors[i].next()
        .then(() => this)
        .catch(() => i + 1 < this.cursors.length
          ? resolve(this.plusNext(i + 1))
          : reject(new CursorReachEndError()),
        )
    })
  }

  private timesNext(i: number): Promise<Cursors> {
    return new Promise((resolve, reject) => {
      this.cursors[i].next()
        .then(() => resolve(this))
        .catch(() => i === 0
          ? reject(new CursorReachEndError())
          : resolve(this.cursors[i].moveToFirst().then(() => this.timesNext(i - 1))),
        )
    })
  }
}
