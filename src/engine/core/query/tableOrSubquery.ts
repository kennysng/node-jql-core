import { JoinedTableOrSubquery, Query, TableOrSubquery } from 'node-jql'
import uuid = require('uuid/v4')
import { TEMP_DB_KEY } from '../../../core'
import { Database } from '../../../schema/database'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { NoDatabaseSelectedError } from '../../../utils/error/NoDatabaseSelectedError'
import { ICompilingQueryOptions } from '../compiledSql'
import { CompiledQuery } from '../query'
import { CompiledJoinClause } from './joinClause'

export class CompiledTableOrSubquery {
  public readonly databaseKey: string
  public readonly tableKey: string
  public readonly aliasKey?: string

  public readonly query?: CompiledQuery

  constructor(protected readonly sql: TableOrSubquery, options: ICompilingQueryOptions) {
    try {
      if (sql.table instanceof Query) {
        this.databaseKey = TEMP_DB_KEY
        this.tableKey = this.aliasKey = uuid()
        this.query = new CompiledQuery(sql.table, options, sql.$as, this.aliasKey)
        options.unknowns.push(...this.query.unknowns)
        options.aliases[sql.$as as string] = this.aliasKey
      }
      else {
        let database: Database
        if (sql.database) {
          database = options.schema.getDatabase(sql.database)
          this.databaseKey = database.key
        }
        else if (options.defaultDatabase) {
          this.databaseKey = options.defaultDatabase
          database = options.schema.getDatabase(this.databaseKey)
        }
        else {
          throw new NoDatabaseSelectedError()
        }
        this.tableKey = database.getTable(sql.table).key
        if (sql.$as) this.aliasKey = options.aliases[sql.$as] = uuid()
      }
    }
    catch (e) {
      throw new InstantiateError('Fail to compile TableOrSubquery', e)
    }
  }

  get $as(): string|undefined {
    return this.sql.$as || this.sql.table as string
  }

  get key(): string {
    return this.aliasKey || this.tableKey
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledTableOrSubquery'
  }

  public equals(obj: CompiledTableOrSubquery): boolean {
    if (this === obj) return true
    if (this.databaseKey !== obj.databaseKey || this.tableKey !== obj.tableKey || this.aliasKey !== obj.aliasKey || this.$as !== obj.$as) return false
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
