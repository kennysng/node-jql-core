import { JQLError } from '.'

export class AlreadyCommittedError extends JQLError {
  constructor(message: string, error?: Error) {
    super('AlreadyCommittedError', message, error)
  }
}
