import { JQLError } from '.'

/**
 * Throw when the Query result set is empty in order to skip the processes
 */
export class EmptyResultsetError extends JQLError {
  constructor(error?: Error) {
    super('Query completed due to empty result set', error)
  }
}
