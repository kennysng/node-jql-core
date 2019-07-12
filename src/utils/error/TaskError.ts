import { JQLError } from 'node-jql'

/**
 * Throw when there is a task error
 */
export class TaskError extends JQLError {
  constructor(message: string, error?: Error) {
    super('TaskError', message, error)
  }
}
