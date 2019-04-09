import { JQLError } from '.'

export class AlreadyExistsError extends JQLError {
  constructor(message: string, error?: Error) {
    super('AlreadyExistsError', message, error)
  }
}
