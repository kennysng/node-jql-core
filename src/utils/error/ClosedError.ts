import { JQLError } from 'node-jql'

/**
 * Throw when something is closed but being called
 */
export class ClosedError extends JQLError {
  constructor(message: string, error?: Error) {
    super('ClosedError', message, error)
  }
}
