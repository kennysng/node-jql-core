import { Cursor } from '.'
import { NotFoundError } from '../../utils/error/NotFoundError'

/**
 * An empty cursor with a dummy row
 */
export class DummyCursor extends Cursor {
  // @override
  public async moveToFirst(): Promise<boolean> {
    return true
  }

  // @override
  public async get<T>(key: string): Promise<T> {
    throw new NotFoundError(`Key not found in cursor: ${key}`)
  }

  // @override
  public async next(): Promise<boolean> {
    return false
  }
}
