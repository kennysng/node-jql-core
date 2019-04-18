import { ICursor } from '.'
import { IRow } from '../../../core/interfaces'
import { CursorError } from '../../../utils/error/CursorError'
import { ITableInfo } from '../compiledSql'
import { CompiledConditionalExpression } from '../expression'
import { CompiledJoinedTableOrSubquery, CompiledTableOrSubquery } from '../query/tableOrSubquery'
import { Sandbox } from '../sandbox'

export class TableCursor implements ICursor {
  private currentIndex = -1
  private readonly tables: ITableInfo[]

  private currentRow: IRow

  constructor(private readonly sandbox: Sandbox, private readonly tableOrSubquery: CompiledTableOrSubquery) {
    this.tables = [tableOrSubquery.tableInfo]
    if (tableOrSubquery instanceof CompiledJoinedTableOrSubquery) {
      this.tables.push(...tableOrSubquery.joinClauses.map(joinClause => joinClause.tableOrSubquery.tableInfo))
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
  public next(): Promise<TableCursor> {
    delete this.currentRow
    return this.nextIndex()
      .then(() => this.computeRow())
      .then(() => {
        if (this.tableOrSubquery instanceof CompiledJoinedTableOrSubquery) {
          const expressions = this.tableOrSubquery.joinClauses.reduce<CompiledConditionalExpression[]>((result, joinClause) => {
            if (joinClause.$on) result.push(joinClause.$on)
            return result
          }, [])
          return this.validateRow(0, expressions)
        }
        return this
      })
  }

  // This is only the maximum possible length, but not the actual length
  private length(): Promise<number> {
    return Promise.all(this.tables.map(({ database, key }) => this.sandbox.getCount(database, key)))
      .then(lengths => lengths.reduce((total, length) => total * length, 1))
  }

  private nextIndex(): Promise<number> {
    return Promise.all([this.currentIndex + 1, this.length()])
      .then(([index, length]) => {
        index = this.currentIndex = Math.max(-1, Math.min(length, index))
        if (index < 0 || index >= length) throw new CursorError('The Cursor has reached the end')
        return index
      })
  }

  private computeIndices(): Promise<number[]> {
    let promise: Promise<any> = Promise.resolve()
    const indices = [] as number[]
    for (let i = this.tables.length - 1, base = 1; i >= 0; i -= 1) {
      ((i, base) => {
        const { database, key } = this.tables[i]
        promise = promise
          .then(() => this.sandbox.getCount(database, key))
          .then(length => {
            indices[i] = Math.floor(this.currentIndex / base) % length
            base *= length
          })
      })(i, base)
    }
    return promise.then(() => indices)
  }

  private computeRow(): Promise<IRow> {
    return this.computeIndices()
      .then(indices => {
        const row = this.currentRow = {} as IRow
        let promise = Promise.resolve(row)
        for (let i = 0, length = this.tables.length; i < length; i += 1) {
          const { database, key } = this.tables[i]
          const index = indices[i]
          promise = promise.then(row => this.sandbox.getContext(database, key, index).then(row_ => Object.assign(row, row_)))
        }
        return promise
      })
  }

  private validateRow(i: number, expressions: CompiledConditionalExpression[]): Promise<TableCursor> {
    return new Promise((resolve, reject) => {
      const expression = expressions[i]
      expression.evaluate(this, this.sandbox)
        .then(result => {
          if (!result) {
            return resolve(this.next())
          }
          else if (i + 1 < expressions.length) {
            return resolve(this.validateRow(i + 1, expressions))
          }
          else {
            return reject(new CursorError('The Cursor has reached the end'))
          }
        })
    })
  }
}
