import { JQLError } from '.'

export class NotFoundError extends JQLError {
  constructor(message: string, error?: Error) {
    super('NotFoundError', message, error)
  }
}
