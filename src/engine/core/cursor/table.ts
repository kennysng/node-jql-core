import { Cursors, ICursor } from '.'
import { IRow } from '../../../core/interfaces'
import { CursorError } from '../../../utils/error/CursorError'
import { CursorReachEndError } from '../../../utils/error/CursorReachEndError'
import { CompiledConditionalExpression } from '../expression'
import { CompiledJoinedTableOrSubquery, CompiledTableOrSubquery } from '../query/tableOrSubquery'
import { Sandbox } from '../sandbox'

export class TableCursor implements ICursor {
  private currentIndex = -1
  private currentRow: IRow
  private readonly tables: CompiledTableOrSubquery[]

  private length = 0
  private tableLengths: { [key: string]: number } = {}

  constructor(private readonly sandbox: Sandbox, private readonly tableOrSubquery: CompiledTableOrSubquery, private readonly baseCursor?: ICursor) {
    this.tables = [tableOrSubquery]
    if (tableOrSubquery instanceof CompiledJoinedTableOrSubquery) {
      this.tables.push(...tableOrSubquery.joinClauses.map(joinClause => joinClause.tableOrSubquery))
    }
  }

  /**
   * Move the cursor to the first row
   */
  public async moveToFirst(): Promise<TableCursor> {
    this.currentIndex = -1
    const promises = this.tables.map(({ databaseKey, tableKey }) => this.sandbox.getCount(databaseKey, tableKey))

    // prepare table lengths and cursor length
    // note that the lengths can be cached as no writing is allowed when reading
    const lengths = await Promise.all(promises)
    for (let i = 0, length = this.tables.length; i < length; i += 1) {
      const { databaseKey, tableKey } = this.tables[i]
      this.tableLengths[`${databaseKey}-${tableKey}`] = lengths[i]
    }
    this.length = lengths.reduce((total, length) => total * length, 1)

    return this.next()
  }

  // @override
  public get(key: string): any {
    if (!this.currentRow) throw new CursorError('The Cursor is not ready')
    return this.currentRow[key]
  }

  // @override
  public async next(): Promise<TableCursor> {
    delete this.currentRow
    this.nextIndex()
    await this.computeRow()
    if (this.tableOrSubquery instanceof CompiledJoinedTableOrSubquery) {
      const expressions = this.tableOrSubquery.joinClauses.reduce<CompiledConditionalExpression[]>((result, joinClause) => {
        if (joinClause.$on) result.push(joinClause.$on)
        return result
      }, [])
      return (await this.validateRow(expressions)) ? this : this.next()
    }
    return this
  }

  private nextIndex(): number {
    const index = this.currentIndex = Math.max(-1, Math.min(this.length, this.currentIndex + 1))
    if (index < 0 || index >= this.length) throw new CursorReachEndError()
    return index
  }

  private computeIndices(): number[] {
    const indices = [] as number[]
    for (let i = this.tables.length - 1, base = 1; i >= 0; i -= 1) {
      const { databaseKey, tableKey } = this.tables[i]
      const length = this.tableLengths[`${databaseKey}-${tableKey}`]
      indices[i] = Math.floor(this.currentIndex / base) % length
      base *= length
    }
    return indices
  }

  private async computeRow(): Promise<IRow> {
    const indices = this.computeIndices()
    const row = this.currentRow = {} as IRow
    for (let i = 0, length = this.tables.length; i < length; i += 1) {
      const { databaseKey, tableKey, key } = this.tables[i]
      const index = indices[i]
      const row_ = await this.sandbox.getContext(databaseKey, tableKey, index)
      for (const key_ in row_) {
        if (row_.hasOwnProperty(key_)) {
          row[`${key}-${key_}`] = row_[key_]
        }
      }
    }
    return row
  }

  private async validateRow(expressions: CompiledConditionalExpression[]): Promise<boolean> {
    for (const expression of expressions) {
      const cursor = this.baseCursor ? new Cursors([this.baseCursor, this], '+') : this
      const { value } = await expression.evaluate(cursor, this.sandbox)
      if (!value) return false
    }
    return true
  }
}
