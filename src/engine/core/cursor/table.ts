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

  constructor(private readonly sandbox: Sandbox, private readonly tableOrSubquery: CompiledTableOrSubquery, private readonly baseCursor?: ICursor) {
    this.tables = [tableOrSubquery]
    if (tableOrSubquery instanceof CompiledJoinedTableOrSubquery) {
      this.tables.push(...tableOrSubquery.joinClauses.map(joinClause => joinClause.tableOrSubquery))
    }
  }

  /**
   * Move the cursor to the first row
   */
  public moveToFirst(): Promise<TableCursor> {
    this.currentIndex = -1
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
    await this.nextIndex()
    await this.computeRow()
    if (this.tableOrSubquery instanceof CompiledJoinedTableOrSubquery) {
      const expressions = this.tableOrSubquery.joinClauses.reduce<CompiledConditionalExpression[]>((result, joinClause) => {
        if (joinClause.$on) result.push(joinClause.$on)
        return result
      }, [])
      return (await this.validateRow(0, expressions)) ? this : this.next()
    }
    return this
  }

  // This is only the maximum possible length, but not the actual length
  private async length(): Promise<number> {
    const promises = this.tables.map(({ databaseKey, tableKey }) => this.sandbox.getCount(databaseKey, tableKey))
    const lengths = await Promise.all(promises)
    return lengths.reduce((total, length) => total * length, 1)
  }

  private async nextIndex(): Promise<number> {
    const length = await this.length()
    const index = this.currentIndex = Math.max(-1, Math.min(length, this.currentIndex + 1))
    if (index < 0 || index >= length) throw new CursorReachEndError()
    return index
  }

  private async computeIndices(): Promise<number[]> {
    const indices = [] as number[]
    for (let i = this.tables.length - 1, base = 1; i >= 0; i -= 1) {
      const { databaseKey, tableKey } = this.tables[i]
      const length = await this.sandbox.getCount(databaseKey, tableKey)
      indices[i] = Math.floor(this.currentIndex / base) % length
      base *= length
    }
    return indices
  }

  private async computeRow(): Promise<IRow> {
    const indices = await this.computeIndices()
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

  private async validateRow(i: number, expressions: CompiledConditionalExpression[]): Promise<boolean> {
    return new Promise(async resolve => {
      const expression = expressions[i]
      const cursor = this.baseCursor ? new Cursors([this.baseCursor, this], '+') : this
      const { value } = await expression.evaluate(cursor, this.sandbox)
      if (!value) {
        resolve(false)
      }
      else if (i + 1 < expressions.length) {
        resolve(this.validateRow(i + 1, expressions))
      }
      else {
        resolve(true)
      }
    })
  }
}
