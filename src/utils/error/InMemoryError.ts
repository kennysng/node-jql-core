import { JQLError } from 'node-jql'

/**
 * Throw when error exists in handling InMemoryDatabase
 */
export class InMemoryError extends JQLError {
  constructor(message: string, error?: Error) {
    super('InMemoryError', message, error)
  }
}
