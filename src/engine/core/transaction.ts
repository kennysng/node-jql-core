import { DatabaseCore } from '../../core'
import { Connection } from '../../core/connection'
import { Logger } from '../../utils/logger'

export abstract class Transaction extends Connection {
  public static count = 0

  public readonly id = ++Transaction.count
  public closed: boolean = false

  protected readonly logger: Logger = new Logger(`[Transaction#${this.id}]`)

  constructor(protected readonly connection: Connection, core: DatabaseCore) {
    super(core)
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'Transaction'
  }

  public commit(): void {
    this.core.engine.commitTransaction(this)
  }
}
