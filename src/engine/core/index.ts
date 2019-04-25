import { Query } from 'node-jql'
import { IQueryResult, IResult, IRow } from '../../core/interfaces'
import { Schema } from '../../schema'
import { Column } from '../../schema/column'
import { Database } from '../../schema/database'
import { Table } from '../../schema/table'

/**
 * Define how the Database stores and retrieves data
 */
export abstract class DatabaseEngine {
  // @override
  get [Symbol.toStringTag](): string {
    return 'DatabaseEngine'
  }

  /**
   * Get the Schema
   */
  public abstract getSchema(): Schema|Promise<Schema>

  /**
   * Save the Schema to somewhere if necessary
   * @param schema [Schema]
   */
  public abstract updateSchema(schema: Schema): void|Promise<IResult>

  /**
   * Get the Database by name or key
   * @param nameOrKey [string]
   */
  public abstract getDatabase(nameOrKey: string): Database|Promise<Database>

  /**
   * Get the Table by name or key
   * @param databaseNameOrKey [string]
   * @param nameOrKey [string]
   */
  public abstract getTable(databaseNameOrKey: string, nameOrKey: string): Table|Promise<Table>

  /**
   * Get the number of rows of a Table
   * @param databaseNameOrKey [string]
   * @param nameOrKey [string]
   */
  public abstract getCount(databaseNameOrKey: string, nameOrKey: string): number|Promise<number>

  /**
   * Create a clean Database
   * @param name [string]
   * @param ifNotExists [boolean] Suppress error if the Database with the same name exists
   */
  public abstract createDatabase(name: string, ifNotExists?: true): Promise<IResult>

  /**
   * Rename the Database
   * @param name [string]
   * @param newName [string]
   */
  public abstract renameDatabase(name: string, newName: string): Promise<IResult>

  /**
   * Drop the Database
   * @param nameOrKey [string]
   * @param ifExists [boolean] Suppress error if the Database does not exists
   */
  public abstract dropDatabase(nameOrKey: string, ifExists?: true): Promise<IResult>

  /**
   * Create a clean Table
   * @param databaseNameOrKey [string]
   * @param name [string]
   * @param columns [Array<Column>]
   * @param ifNotExists [boolean] Suppress error if the Table with the same name exists
   */
  public abstract createTable(databaseNameOrKey: string, name: string, columns: Column[], ifNotExists?: true): Promise<IResult>

  /**
   * Rename the Table
   * @param databaseNameOrKey [string]
   * @param name [string]
   * @param newName [string]
   */
  public abstract renameTable(databaseNameOrKey: string, name: string, newName: string): Promise<IResult>

  /**
   * Remove the Table
   * @param databaseNameOrKey [string]
   * @param name [string]
   * @param ifExists [boolean] Suppress error if the Table does not exists
   */
  public abstract dropTable(databaseNameOrKey: string, name: string, ifExists?: true): Promise<IResult>

  /**
   * Run a Query
   * @param query [Query]
   * @param args [Array<any>]
   */
  public abstract query(query: Query, ...args: any[]): Promise<IQueryResult>

  /**
   * Run a Query
   * @param databaseNameOrKey [string]
   * @param query [Query]
   * @param args [Array<any>]
   */
  public abstract query(databaseNameOrKey: string, query: Query, ...args: any[]): Promise<IQueryResult>

  /**
   * Insert data into a Table
   * @param databaseNameOrKey [string]
   * @param name [string]
   * @param values [Array<IRow>]
   */
  public abstract insertInto(databaseNameOrKey: string, name: string, values: IRow[]): Promise<IResult>

  /**
   * Get the required rows
   * @param databaseNameOrKey [string]
   * @param tableNameOrKey [string]
   */
  public abstract getContext(databaseNameOrKey: string, tableNameOrKey: string): IRow[]|Promise<IRow[]>

  /**
   * Get the required row of data
   * @param databaseNameOrKey [string]
   * @param tableNameOrKey [string]
   * @param rowIndex [number]
   */
  public abstract getContext(databaseNameOrKey: string, tableNameOrKey: string, rowIndex: number): IRow|Promise<IRow>

  /**
   * Update datasource in database level. Save the context to somewhere (if necessary)
   * @param databaseNameOrKey [string]
   * @param value [Map<string,Array<IRow>>] Remove if value is undefined
   */
  public abstract setContext(databaseNameOrKey: string, value?: { [key: string]: IRow[] }): void|Promise<IResult>

  /**
   * Update datasource in table level. Save the context to somewhere (if necessary)
   * @param databaseNameOrKey [string]
   * @param tableNameOrKey [string]
   * @param value [Array<IRow>] Remove if value is undefined
   */
  public abstract setContext(databaseNameOrKey: string, tableNameOrKey: string, value?: IRow[]): void|Promise<IResult>

  // TODO alter table

  // TODO update from

  // TODO delete from
}
