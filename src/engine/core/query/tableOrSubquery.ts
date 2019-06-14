import { CancelableAxiosPromise } from '@kennysng/c-promise'
import { JoinClause, JoinedTableOrSubquery, JoinOperator, Query, TableOrSubquery, Type } from 'node-jql'
import uuid = require('uuid/v4')
import { TEMP_DB_KEY } from '../../../core'
import { Column, Database, Table } from '../../../schema'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { NoDatabaseSelectedError } from '../../../utils/error/NoDatabaseSelectedError'
import { ICompilingQueryOptions } from '../compiledSql'
import { CompiledExpression } from '../expression'
import { compile } from '../expression/compile'
import { CompiledQuery } from '../query'

export class CompiledTableOrSubquery {
  public readonly databaseKey: string
  public readonly tableKey: string
  public readonly aliasKey?: string

  public readonly query?: CompiledQuery
  public readonly remote?: Table
  public readonly request?: CancelableAxiosPromise<any>

  constructor(protected readonly sql: TableOrSubquery, options: ICompilingQueryOptions) {
    try {
      if (sql.table instanceof Query || typeof sql.table !== 'string') {
        this.databaseKey = TEMP_DB_KEY
        this.tableKey = this.aliasKey = uuid()
        options.aliases[sql.$as as string] = this.aliasKey

        if (sql.table instanceof Query) {
          this.query = new CompiledQuery(sql.table, options, sql.$as, this.aliasKey)
          options.unknowns.push(...this.query.unknowns)
        }
        else {
          const table = this.remote = new Table(sql.$as as string, this.tableKey)
          for (const { name, type } of sql.table.columns) table.addColumn(new Column(name, type || 'any'))
          this.request = new CancelableAxiosPromise<any>(sql.table, options.databaseOptions && options.databaseOptions.axiosInstance)
        }
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

  get structure(): Table|undefined {
    return this.remote || this.query && this.query.structure
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

export class CompiledJoinClause {
  public readonly tableOrSubquery: CompiledTableOrSubquery
  public readonly $on?: CompiledExpression

  constructor(private readonly sql: JoinClause, tableOrSubquery: CompiledJoinedTableOrSubquery, options: ICompilingQueryOptions) {
    try {
      this.tableOrSubquery = new CompiledTableOrSubquery(sql.tableOrSubquery, options)
      if (sql.$on) {
        this.$on = compile(sql.$on, { ...options, tables: [tableOrSubquery, this.tableOrSubquery] })
      }
    }
    catch (e) {
      throw new InstantiateError('Fail to compile JoinClause', e)
    }
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'CompiledJoinClause'
  }

  get operator(): JoinOperator {
    return this.sql.operator
  }

  public equals(obj: CompiledJoinClause): boolean {
    if (this === obj) return true
    if (!this.tableOrSubquery.equals(obj.tableOrSubquery)) return false
    if (!this.$on && !obj.$on) return true
    return (this.$on && obj.$on && this.$on.equals(obj.$on)) || false
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
