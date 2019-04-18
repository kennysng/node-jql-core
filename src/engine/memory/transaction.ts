import { InMemoryEngine } from '.'
import { DatabaseCore } from '../../core'
import { Connection } from '../../core/connection'
import { Logger } from '../../utils/logger'
import { Transaction } from '../core/transaction'

export class InMemoryTransaction extends Transaction {
  public databaseKey?: string

  protected readonly logger: Logger = new Logger(`[InMemoryTransaction#${this.id}]`)
  protected readonly tempEngine = new InMemoryEngine()

  constructor(protected readonly connection: Connection, core: DatabaseCore) {
    super(connection, core)
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'InMemoryTransaction'
  }
}
