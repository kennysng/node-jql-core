import { JoinedTableOrSubquery, Query, TableOrSubquery } from 'node-jql'
import { CompiledQuery } from '.'
import { TEMP_DB_KEY as TEMP_DATABASE_KEY } from '../../../core'
import { Database } from '../../../schema/database'
import { Table } from '../../../schema/table'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { NoDatabaseSelectedError } from '../../../utils/error/NoDatabaseSelectedError'
import { ICompilingQueryOptions, ITableInfo } from '../compiledSql'
import { CompiledJoinClause } from './joinClause'

export class CompiledTableOrSubquery {
  public readonly databaseKey: string
  public readonly tableKey: string
  public readonly query?: CompiledQuery

  constructor(protected readonly sql: TableOrSubquery, options: ICompilingQueryOptions) {
    try {
      let database: Database
      if (sql.table instanceof Query) {
        this.databaseKey = TEMP_DATABASE_KEY
        this.query = new CompiledQuery(sql.table, options)
        this.tableKey = this.query.structure.key
        options.unknowns.push(...this.query.unknowns)
      }
      else {
        if (sql.database) {
          database = options.schema.getDatabase(sql.database)
          this.databaseKey = database.key
        }
        else if (options.defaultDatabase) {
          database = options.schema.getDatabase(this.databaseKey = options.defaultDatabase)
        }
        else {
          throw new NoDatabaseSelectedError()
        }

        this.tableKey = database.getTable(sql.table).key
      }

      // register alias
      if (sql.$as) options.aliases[sql.$as] = this.tableKey
    }
    catch (e) {
      throw new InstantiateError('Fail to compile TableOrSubquery', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledTableOrSubquery'
  }

  get tableInfo(): ITableInfo {
    if (this.query) {
      const query = this.query
      return {
        database: this.databaseKey,
        name: this.$as,
        key: this.tableKey,
        get tempTable(): Table {
          return query.structure
        },
      }
    }
    else {
      return {
        database: this.databaseKey,
        name: this.$as || this.sql.table as string,
        key: this.tableKey,
      }
    }
  }

  get $as(): string|undefined {
    return this.sql.$as
  }

  public equals(obj: CompiledTableOrSubquery): boolean {
    if (this === obj) return true
    if (this.$as !== obj.$as || this.databaseKey !== obj.databaseKey || this.tableKey !== obj.tableKey) return false
    return (this.query && obj.query && this.query.equals(obj.query)) || false
  }
}

export class CompiledJoinedTableOrSubquery extends CompiledTableOrSubquery {
  public readonly joinClauses: CompiledJoinClause[]

  constructor(protected readonly sql: JoinedTableOrSubquery, options: ICompilingQueryOptions) {
    super(sql, options)
    try {
      this.joinClauses = sql.joinClauses.map(joinClause => new CompiledJoinClause(joinClause, this, options))
    }
    catch (e) {
      throw new InstantiateError('Fail to compile JoinedTableOrSubquery', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledJoinedTableOrSubquery'
  }

  // @override
  public equals(obj: CompiledJoinedTableOrSubquery): boolean {
    if (this === obj) return true
    if (!super.equals(obj)) return false
    if (this.joinClauses.length !== obj.joinClauses.length) return false
    for (const joinClause of this.joinClauses) {
      if (!obj.joinClauses.find(j => joinClause.equals(j))) return false
    }
    return true
  }
}
