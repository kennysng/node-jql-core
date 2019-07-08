import _ from 'lodash'
import { checkNull } from 'node-jql'
import { Cursor } from '.'
import { InMemoryError } from '../../utils/error/InMemoryError'
import { CompiledConditionalExpression } from '../expr'
import { CompiledFromTable } from '../query/FromTable'
import { Sandbox } from '../sandbox'
import { Table } from '../table'
import { DummyCursor } from './dummy'

class RowCursor extends DummyCursor {
  constructor(private readonly row: any) {
    super()
  }

  // @override
  public async get<T>(key: string): Promise<T> {
    return this.row[key]
  }
}

/**
 * Traverse throught table content
 */
export class TableCursor extends Cursor {
  private rows: number[][] = []
  private index: number
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
    for (let i = 0, length = this.sandbox.getCountOf(this.table); i < length; i += 1) this.rows.push([i])
    for (let i = 0, length = this.table.joinClauses.length; i < length; i += 1) {
      const { operator, table, $on } = this.table.joinClauses[i]
      const expression = $on as CompiledConditionalExpression
      switch (operator) {
        case 'LEFT': {
          const rows = [] as number[][]
          for (let j = 0, length2 = this.rows.length; j < length2; j += 1) {
            let matched = false

            // find matched row(s)
            for (let k = 0, length3 = this.sandbox.getCountOf(table); k < length3; k += 1) {
              const indices = [...this.rows[j], k]
              if (await expression.evaluate(this.sandbox, new RowCursor(this.buildRow(indices)))) {
                rows.push(indices)
                matched = true
              }
            }

            // no matched rows
            if (!matched) {
              const indices = [...this.rows[j], -1]
              rows.push(indices)
            }
          }
          this.rows = rows
          break
        }
        case 'RIGHT': {
          const rows = [] as number[][]
          for (let j = 0, length2 = this.sandbox.getCountOf(table); j < length2; j += 1) {
            let matched = false

            // find matched row(s)
            for (let k = 0, length3 = this.rows.length; k < length3; k += 1) {
              this.pad(this.rows[k], i + 2)
              const indices = [...this.rows[k], j]
              if (await expression.evaluate(this.sandbox, new RowCursor(this.buildRow(indices)))) {
                rows.push(indices)
                matched = true
              }
            }

            // no matched rows
            if (!matched) {
              const indices = [] as number[]
              this.pad(indices, i + 2)
              indices.push(j)
              rows.push(indices)
            }
          }
          this.rows = rows
          break
        }
        case 'CROSS':
          // join all
          this.rows = this.rows.reduce<number[][]>((result, row) => {
            for (let j = 0, length2 = this.sandbox.getCountOf(table); j < length2; j += 1) result.push([...row, j])
            return result
          }, [])
          break
        case 'FULL': {
          const matched = { l: [] as boolean[], r: [] as boolean[] }

          // find matched row(s)
          const rows = [] as number[][]
          for (let j = 0, length2 = this.rows.length; j < length2; j += 1) {
            for (let k = 0, length3 = this.sandbox.getCountOf(table); k < length3; k += 1) {
              const indices = [...this.rows[j], k]
              if (await expression.evaluate(this.sandbox, new RowCursor(this.buildRow(indices)))) {
                rows.push(indices)
                matched.l[j] = matched.r[k] = true
              }
            }
          }

          // left - no matched rows
          for (let j = 0, length2 = this.rows.length; j < length2; j += 1) {
            if (!matched.l[j]) {
              rows.push([...this.rows[j], -1])
            }
          }

          // right - no matched rows
          for (let j = 0, length2 = this.sandbox.getCountOf(table); j < length2; j += 1) {
            if (!matched.r[j]) {
              const indices = [] as number[]
              this.pad(indices, i + 2)
              indices.push(j)
              rows.push(indices)
            }
          }

          this.rows = rows
          break
        }
        case 'INNER': {
          const rows = [] as number[][]
          for (let j = 0, length2 = this.rows.length; j < length2; j += 1) {
            // find matched row(s)
            for (let k = 0, length3 = this.sandbox.getCountOf(table); k < length3; k += 1) {
              const indices = [...this.rows[j], k]
              if (await expression.evaluate(this.sandbox, new RowCursor(this.buildRow(indices)))) rows.push(indices)
            }
          }
          this.rows = rows
          break
        }
      }
    }
    this.index = -1
    return this.next()
  }

  // @override
  public async get<T>(key: string): Promise<T> {
    if (!this.row) throw new InMemoryError('Cursor is not ready. Please call moveToFirst() first')
    return this.row[key]
  }

  // @override
  public async next(): Promise<boolean> {
    // reset
    this.row = undefined

    // increment index
    this.index = Math.min(this.rows.length, this.index + 1)
    if (this.index >= this.rows.length) return false

    // build row
    const row_ = this.rows[this.index]
    const row = this.row = {} as any
    this.updateRow(row, this.sandbox.getRowOf(this.table, row_[0]), this.table.table)
    for (let i = 0, length = this.table.joinClauses.length; i < length; i += 1) {
      const table = this.table.joinClauses[i].table
      this.updateRow(row, this.sandbox.getRowOf(table, row_[i + 1]), table.table)
    }

    return true
  }

  private pad(indices: number[], length: number): any {
    for (let i = 0; i < length; i += 1) {
      if (checkNull(indices[i])) indices[i] = -1
    }
  }

  private buildRow(indices: number[]): any {
    const row = {} as any
    for (let i = 0, length = indices.length; i < length; i += 1) {
      const table = i === 0 ? this.table : this.table.joinClauses[i - 1].table
      const index = indices[i]
      this.updateRow(row, this.sandbox.getRowOf(table, index), table.table)
    }
    return row
  }

  private updateRow(l: any, r: any, table: Table) {
    for (const { id, name } of table.columns) l[id] = r[name]
  }
}
