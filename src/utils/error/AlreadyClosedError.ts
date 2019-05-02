import { JQLError } from '.'

/**
 * Throw when someone works on a closed Transaction etc.
 */
export class AlreadyClosedError extends JQLError {
  constructor(message: string, error?: Error) {
    super('AlreadyClosedError', message, error)
  }
}
