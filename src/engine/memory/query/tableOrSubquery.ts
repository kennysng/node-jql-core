import { CancelableAxiosPromise } from '@kennysng/c-promise'
import { JoinClause, JoinedTableOrSubquery, JoinOperator, Query, TableOrSubquery } from 'node-jql'
import { IRemoteTable } from 'node-jql/dist/query'
import uuid = require('uuid/v4')
import { CompiledQuery } from '.'
import { TEMP_DB_KEY } from '../../../core'
import { Column, Database, Table } from '../../../schema'
import { InstantiateError } from '../../../utils/error/InstantiateError'
import { NoDatabaseSelectedError } from '../../../utils/error/NoDatabaseSelectedError'
import { ICompilingQueryOptions } from '../compiledSql'
import { CompiledExpression } from '../expression'
import { compile } from '../expression/compile'

export class CompiledTableOrSubquery {
  public readonly databaseKey: string
  public readonly tableKey: string
  public readonly aliasKey?: string

  public readonly query?: CompiledQuery
  public readonly remote?: Table

  private request_?: CancelableAxiosPromise<any>

  constructor(protected readonly sql: TableOrSubquery, protected readonly options: ICompilingQueryOptions) {
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
        }
      }
      else {
        let database: Database
        try {
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
        }
        catch (e) {
          try {
            database = options.sandbox.schema.getDatabase(this.databaseKey = TEMP_DB_KEY)
            this.tableKey = database.getTable(sql.table).key
          }
          catch (e_) {
            throw e
          }
        }
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

  get request(): CancelableAxiosPromise<any>|undefined {
    if (!this.remote) return
    return this.request_ = this.request_ || new CancelableAxiosPromise<any>(this.sql.table as IRemoteTable, this.options.databaseOptions && this.options.databaseOptions.axiosInstance)
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
