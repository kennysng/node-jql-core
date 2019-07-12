# node-jql-core

[![npm version](https://badge.fury.io/js/node-jql-core.svg)](https://badge.fury.io/js/node-jql-core)

This is a SQL database mainly designed for providing an interface for JSON processing with the SQL syntax. It works with the syntax library [node-jql](https://github.com/kennysng/node-jql)

# Memory Engine

## PAY ATTENTION

Note: It's still under development. Please avoid using it in production

Note: It's not fully optimized, and may be slow. Please avoid doing intensive computation with this engine

Note: NodeJS version 8 or higher is highly recommended due to the native support of `async/await`

# Custom Engine

You can develop your custom engine.  

Please check [CancelablePromise](https://github.com/kennysng/c-promise)

``` js
abstract class DatabaseEngine {
  protected initing = false
  protected inited = false

  /**
   * Initialize the engine
   */
  public abstract async init(): Promise<void>

  /**
   * Retrieve all rows from a table
   * @param database [string] database name
   * @param table [string] table name
   */
  public abstract retrieveRowsFor(database: string, table: string): CancelablePromise<any[]>

  /**
   * Get the row count of a table
   * @param database [string] database name
   * @param table [string] table name
   */
  public abstract getCountOf(database: string, table: string): CancelablePromise<number>

  /**
   * Create a database
   * @param name [string]
   */
  public abstract createDatabase(name: string): TaskFn<IUpdateResult>

  /**
   * Drop a database
   * @param name [string]
   */
  public abstract dropDatabase(name: string): TaskFn<IUpdateResult>

  /**
   * Execute an UPDATE JQL
   * @param jql [JQL]
   */
  public abstract executeUpdate(jql: JQL): TaskFn<IUpdateResult>

  /**
   * Execute a SELECT JQL
   * @param jql [AnalyzedQuery]
   */
  public abstract executeQuery(jql: AnalyzedQuery): TaskFn<IQueryResult>
}
```

``` js

type TaskFn<T> = (task: Task<T>) => CancelablePromise<T>

class Task {
  /**
   * Task ID
   */
  public readonly id = uuid()

  /**
   * Task that can be canceled
   */
  public readonly promise: CancelablePromise<T>

  /**
   * Start time of the task
   */
  public readonly startFrom = Date.now()

  /**
   * Task status
   */
  public statusCode = StatusCode.PREPARING
}
```

# Performance Benchmark

Try it with `npm run test` or `yarn test`. It will traverse 200000 rows of data at maximum in specific cases. 