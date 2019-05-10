import { IMapping, IQueryResult } from '../../../core/interfaces'
import { RowsCursor } from './rows'

export class ResultSet<T = any> extends RowsCursor {
  constructor(private readonly result: IQueryResult) {
    super(result.data)
  }

  get sql(): string|undefined {
    return this.result.sql
  }

  get time(): number {
    return this.result.time
  }

  // @override
  public get(key: [string, string]|[string]|string): any {
    const row = this.rows[this.currentIndex]
    if (typeof key === 'string') {
      if (key in row) return row[key]
      key = [key]
    }
    let mapping: IMapping|undefined
    switch (key.length) {
      case 1:
        mapping = this.result.mappings.find(({ column }) => column === key[0])
        break
      case 2:
        mapping = this.result.mappings.find(({ table, column }) => table === key[0] && column === key[1])
        break
    }
    return mapping ? row[mapping.key] : undefined
  }
}
