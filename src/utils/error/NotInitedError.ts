import { JQLError } from 'node-jql'

/**
 * Throw when the instance is not initialized
 */
export class NotInitedError<T = any> extends JQLError {
  constructor(fn: new (...args: any[]) => T, error?: Error) {
    super('NotInitedError', `${fn.name} not initialized`, error)
  }
}
