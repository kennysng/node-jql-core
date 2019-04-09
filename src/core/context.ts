import { Schema } from '../schema'
import { DataSource } from './datasource'

/**
 * Database context containing data stored and variables defined, as well as the relevant schema
 */
export class Context {
  public readonly datasource: DataSource = new DataSource()
  public readonly schema: Schema = new Schema()

  /**
   * Clone the Context
   */
  public clone(): Context {
    const result = new Context()
    result.datasource.cloneFrom(this.datasource)
    result.schema.cloneFrom(this.schema)
    return result
  }
}
