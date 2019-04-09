import { JQLError } from '.'

export class NoDatabaseSelectedError extends JQLError {
  constructor(error?: Error) {
    super('NoDatabaseSelectedError', 'No database selected', error)
  }
}
