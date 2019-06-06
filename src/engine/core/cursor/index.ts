import { CursorReachEndError } from '../../../utils/error/CursorReachEndError'
import isUndefined from '../../../utils/isUndefined'

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
  get(key: string): Promise<any>

  /**
   * Move to next column. Throw error if reaches the end
   */
  next(): Promise<ICursor>
}

export class DummyCursor implements ICursor {
  // @override
  public async moveToFirst(): Promise<DummyCursor> {
    return this
  }

  // @override
  public async get(key: string): Promise<any> {
    return undefined
  }

  // @override
  public async next(): Promise<DummyCursor> {
    return this
  }
}

/**
 * Joining multiple cursors
 */
export class Cursors implements ICursor {
  constructor(private readonly cursors: ICursor[], private readonly mode: '+'|'*' = '*') {
  }

  // @override
  public async moveToFirst(): Promise<Cursors> {
    const promises = this.cursors.map(cursor => cursor.moveToFirst())
    await Promise.all(promises)
    return this
  }

  // @override
  public async get(key: string): Promise<any> {
    let error: Error|undefined
    for (const cursor of this.cursors) {
      try {
        const value = await cursor.get(key)
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
        return this.timesNext()
    }
  }

  private async plusNext(): Promise<Cursors> {
    let i = 0
    while (true) {
      try {
        await this.cursors[i].next()
        return this
      }
      catch (e) {
        if (!(e instanceof CursorReachEndError) || i === this.cursors.length - 1) {
          throw e
        }
      }
      i += 1
    }
  }

  private async timesNext(): Promise<Cursors> {
    let i = this.cursors.length - 1
    while (true) {
      try {
        await this.cursors[i].next()
        return this
      }
      catch (e) {
        if (!(e instanceof CursorReachEndError) || i === 0) {
          throw e
        }
        await this.cursors[i].moveToFirst()
        i -= 1
      }
    }
  }
}
