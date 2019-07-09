import { checkNull } from 'node-jql'
import { Cursor } from '.'
import { InMemoryError } from '../../utils/error/InMemoryError'
import { NotFoundError } from '../../utils/error/NotFoundError'

/**
 * Group cursors with UNION
 */
export class UnionCursor extends Cursor {
  private readonly cursors: Cursor[]

  /**
   * @param cursors [Array<Cursor>]
   */
  constructor(...cursors: Cursor[]) {
    super()
    if (!cursors.length) throw new InMemoryError('[FATAL] No cursor for grouping')
    this.cursors = cursors
  }

  // @override
  public async moveToFirst(): Promise<boolean> {
    for (let i = 0, length = this.cursors.length; i < length; i += 1) {
      if (await this.cursors[i].moveToFirst()) return true
    }
    return false
  }

  // @override
  public async get<T = any>(key: string): Promise<T> {
    for (let i = 0, length = this.cursors.length; i < length; i += 1) {
      try {
        const value = await this.cursors[i].get<T>(key)
        if (!checkNull(value)) return value
      }
      catch (e) {
        // do nothing
      }
    }
    throw new NotFoundError(`Key not found in cursor: ${key}`)
  }

  // @override
  public async next(): Promise<boolean> {
    for (let i = 0, length = this.cursors.length; i < length; i += 1) {
      if (await this.cursors[i].next()) return true
    }
    return false
  }
}
