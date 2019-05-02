import uuid = require('uuid/v4')
import { DatabaseEngine } from '../engine/core'
import { InMemoryEngine } from '../engine/memory'
import { NotFoundError } from '../utils/error/NotFoundError'
import { Connection } from './connection'

export const TEMP_DB_KEY = uuid()

/**
 * Main class of the Database
 */
export class DatabaseCore {
  public readonly connections: Connection[] = []

  constructor(public readonly engine: DatabaseEngine = new InMemoryEngine()) {
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'DatabaseCore'
  }

  /**
   * Create a Connection for access
   * @param useDatabase [string] Default database
   */
  public createConnection(): Connection {
    const connection = new Connection(this)
    this.connections.push(connection)
    return connection
  }

  /**
   * Drop the Connection
   * @param id [number] The Connection ID
   */
  public closeConnection(id: number): void {
    const index = this.connections.findIndex(connection => connection.id === id)
    if (index === -1) throw new NotFoundError(`Connection #${id} not found`)
    this.connections.splice(index, 1)
  }
}
