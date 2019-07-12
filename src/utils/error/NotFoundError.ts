import { JQLError } from 'node-jql'

/**
 * Throw when something is not found
 */
export class NotFoundError extends JQLError {
  constructor(message: string, error?: Error) {
    super('NotFoundError', message, error)
  }
}
