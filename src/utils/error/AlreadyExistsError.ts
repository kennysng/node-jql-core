import { JQLError } from '.'

/**
 * Throw when Column, Table, or Database, etc. with the same name already exists
 */
export class AlreadyExistsError extends JQLError {
  constructor(message: string, error?: Error) {
    super('AlreadyExistsError', message, error)
  }
}
