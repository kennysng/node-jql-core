import { checkNull } from 'node-jql'
import { Cursor } from '.'
import { InMemoryError } from '../../utils/error/InMemoryError'
import { NotFoundError } from '../../utils/error/NotFoundError'

/**
 * Group cursors
 */
export class Cursors extends Cursor {
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
    for (let i = this.cursors.length - 1; i >= 0; i -= 1) {
      if (!await this.cursors[i].moveToFirst()) return false
    }
    return true
  }

  // @override
  public async get<T>(key: string): Promise<T> {
    for (let i = 0, length = this.cursors.length; i < length; i += 1) {
      const value = await this.cursors[i].get<T>(key)
      if (!checkNull(value)) return value
    }
    throw new NotFoundError(`Key not found in cursor: ${key}`)
  }

  // @override
  public async next(): Promise<boolean> {
    for (let i = this.cursors.length - 1; i >= 0; i -= 1) {
      const result = await this.cursors[i].next()
      if (result) return true
      if (i > 0) await this.cursors[i].moveToFirst()
    }
    return false
  }
}
