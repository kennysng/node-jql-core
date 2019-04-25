import { CursorError } from './CursorError'

/**
 * Throw when the Cursor reaches the end
 */
export class CursorReachEndError extends CursorError {
  constructor(error?: Error) {
    super('The Cursor has reached the end', error)
  }
}
