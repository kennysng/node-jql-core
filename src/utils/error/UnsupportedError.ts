import { JQLError } from '.'

/**
 * Throw when error occurs when calling an unsupported method
 */
export class UnsupportedError extends JQLError {
  constructor(name: string, error?: Error) {
    super('UnsupportedError', `${name} is not supported`, error)
  }
}
