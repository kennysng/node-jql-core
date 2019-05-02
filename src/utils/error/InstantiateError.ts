import { JQLError } from '.'

/**
 * Throw when error occurs when instantiating an object
 */
export class InstantiateError extends JQLError {
  constructor(message: string, error?: Error) {
    super('InstantiateError', message, error)
  }
}
