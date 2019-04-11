import { JQLError } from '.'

/**
 * Throw when no default Database is used before operations
 */
export class NoDatabaseSelectedError extends JQLError {
  constructor(error?: Error) {
    super('NoDatabaseSelectedError', 'No database selected', error)
  }
}
