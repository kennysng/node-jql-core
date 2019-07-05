import { JQLError } from 'node-jql'

/**
 * Throw when there is an error when handling session
 */
export class SessionError extends JQLError {
  constructor(message: string, error?: Error) {
    super('SessionError', message, error)
  }
}
