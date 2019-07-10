import { Cursor } from '.'

/**
 * Lock a cursor i.e. cannot next()
 */
export class FixedCursor extends Cursor {
  /**
   * @param cursor [Cursor]
   */
  constructor(private readonly cursor: Cursor) {
    super()
  }

  // @override
  public async moveToFirst(): Promise<boolean> {
    return true
  }

  // @override
  public async get<T = any>(key: string): Promise<T|undefined> {
    return this.cursor.get(key)
  }

  // @override
  public async next(): Promise<boolean> {
    return false
  }
}
