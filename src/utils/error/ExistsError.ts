import { JQLError } from 'node-jql'

/**
 * Throw when something is already exists
 */
export class ExistsError extends JQLError {
  constructor(message: string, error?: Error) {
    super('ExistsError', message, error)
  }
}
