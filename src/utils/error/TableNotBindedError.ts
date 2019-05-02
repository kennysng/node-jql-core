import { JQLError } from '.'
import { Table } from '../../schema/table'

/**
 * Throw when Table is not binded to a Database but is being used
 */
export class TableNotBindedError extends JQLError {
  constructor(table: Table, error?: Error) {
    super('TableNotBindedError',  `Table '${table.name}' not binded to any Database`, error)
  }
}
