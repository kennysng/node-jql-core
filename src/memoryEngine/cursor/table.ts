import _ from 'lodash'
import { Cursor } from '.'
import { InMemoryError } from '../../utils/error/InMemoryError'
import { NoDatabaseError } from '../../utils/error/NoDatabaseError'
import { CompiledConditionalExpression } from '../expr'
import { CompiledFromTable } from '../query/FromTable'
import { Sandbox } from '../sandbox'

/**
 * Traverse throught table content
 */
export class TableCursor extends Cursor {
  private counts: _.Dictionary<number> = {}
  private indices: _.Dictionary<number> = {}
  private row?: any

  /**
   * @param sandbox [Sandbox]
   * @param table [CompiledFromTable]
   */
  constructor(private readonly sandbox: Sandbox, private readonly table: CompiledFromTable) {
    super()
  }

  // @override
  public async moveToFirst(): Promise<boolean> {
    let count = this.counts[this.table.table.name] = this.sandbox.getCountOf(this.getDatabase(this.table), this.table.table.name)
    this.indices[this.table.table.name] = 0
    if (this.table.joinClauses.length) {
      for (const { operator, table } of this.table.joinClauses) {
        const count_ = this.counts[table.table.name] = this.sandbox.getCountOf(this.getDatabase(table), table.table.name)
        this.indices[table.table.name] = 0
        switch (operator) {
          case 'FULL':
            count = (count + 1) * (count_ + 1)
            break
          case 'CROSS':
          case 'INNER':
            count = count * count_
            break
          case 'LEFT':
            count = count * (count_ + 1)
            break
          case 'RIGHT':
            count = (count + 1) * count_
            break
        }
      }
    }
    if (count === 0) return false
    this.buildRow()
    return true
  }

  // @override
  public async get<T>(key: string): Promise<T> {
    if (!this.row) throw new InMemoryError('Cursor is not ready. Please call moveToFirst() first')
    return this.row[key]
  }

  // @override
  public async next(): Promise<boolean> {
    // increment index
    for (let i = this.table.joinClauses.length; i >= 0; i -= 1) {
      const table = i === 0 ? this.table.table : this.table.joinClauses[i - 1].table.table
      let index = this.indices[table.name] + 1
      if (index >= this.counts[table.name]) {
        if (i === 0) return false
        index = 0
      }
      if ((this.indices[table.name] = index) > 0) break
    }

    // build row
    this.buildRow()

    // check conditions
    const expressions = this.table.joinClauses.reduce<CompiledConditionalExpression[]>((result, { $on }) => {
      if ($on) result.push($on)
      return result
    }, [])
    for (const expression of expressions) if (!await expression.evaluate(this.sandbox, this)) return await this.next()
    return true
  }

  private getDatabase(table: CompiledFromTable): string {
    const database = table.database || this.sandbox.defDatabase
    if (!database) throw new NoDatabaseError()
    return database
  }

  private buildRow(): void {
    this.row = {}
    for (let i = this.table.joinClauses.length; i >= 0; i -= 1) {
      const table = i === 0 ? this.table : this.table.joinClauses[i - 1].table
      const row_ = this.sandbox.getRowOf(this.getDatabase(table), table.table.name, this.indices[table.table.name])
      for (const column of table.table.columns) this.row[column.id] = row_[column.name]
    }
  }
}
