import { JQLError } from '.'

export class InstantiateError extends JQLError {
  constructor(message: string, error?: Error) {
    super('InstantiateError', message, error)
  }
}
