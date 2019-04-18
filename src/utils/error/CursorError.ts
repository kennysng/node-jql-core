import { JQLError } from '.'
import { Table } from '../../schema/table'

/**
 * Throw when the Cursor throws Error
 */
export class CursorError extends JQLError {
  constructor(message: string, error?: Error) {
    super('CursorError',  message, error)
  }
}
