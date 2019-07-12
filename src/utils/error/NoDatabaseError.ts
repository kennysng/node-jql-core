import { JQLError } from 'node-jql'

/**
 * Throw when no database is selected
 */
export class NoDatabaseError extends JQLError {
  constructor(error?: Error) {
    super('NoDatabaseError', 'No database is selected', error)
  }
}
