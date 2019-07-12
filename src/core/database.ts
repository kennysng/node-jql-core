import { CancelablePromise } from '@kennysng/c-promise'
import { JQL, PredictJQL } from 'node-jql'
import EventEmitter from 'wolfy87-eventemitter'
import { ReadWriteLock } from '../utils/lock'
import { DatabaseEngine } from './engine'
import { AnalyzedQuery } from './query'
import { IPredictResult, IQueryResult, IUpdateResult } from './result'
import { StatusCode, TaskFn } from './task'

/**
 * Database instance
 */
export class Database<T extends DatabaseEngine = DatabaseEngine> extends EventEmitter {
  private readonly lock = new ReadWriteLock(0, 1)

  /**
   * @param name [string]
   * @param engine [T] optional
   */
  constructor(public readonly name: string, public readonly engine: T) {
    super()
  }

  /**
   * Create the database
   * @param jql [CreateDatabaseJQL]
   */
  public create(): TaskFn<IUpdateResult> {
    return task => new CancelablePromise(() => this.engine.createDatabase(this.name)(task), async (fn, resolve) => {
      // acquire write lock
      task.status(StatusCode.WAITING)
      await this.lock.write()

      try {
        // create database
        const result = await fn()

        // return
        this.emit('created')
        return resolve(result)
      }
      finally {
        // release write lock
        this.lock.writeEnd()
      }
    })
  }

  /**
   * Drop the database
   */
  public drop(): TaskFn<IUpdateResult> {
    return task => new CancelablePromise(() => this.engine.dropDatabase(this.name)(task), async (fn, resolve) => {
      // acquire write lock
      task.status(StatusCode.WAITING)
      await this.lock.write()

      try {
        // drop database
        const result = await fn()

        // return
        this.emit('deleted')
        return resolve(result)
      }
      finally {
        // release write lock
        this.lock.writeEnd()
      }
    })
  }

  /**
   * Execute an update-related query
   * @param jql [JQL]
   */
  public executeUpdate(jql: JQL): TaskFn<IUpdateResult> {
    return task => new CancelablePromise(() => this.engine.executeUpdate(jql)(task), async (fn, resolve) => {
      // run query
      const result = await fn()

      // return
      this.emit('updated', jql)
      return resolve(result)
    })
  }

  /**
   * Predict the result structure of a select-related query
   * @param jql [PredictJQL]
   */
  public predictQuery(jql: PredictJQL): TaskFn<IPredictResult> {
    return task => new CancelablePromise(() => this.engine.predictQuery(jql, this.name)(task), async (fn, resolve) => {
      // predict query
      const result = await fn()

      // return
      return resolve(result)
    })
  }

  /**
   * Execute a select-related query
   * @param jql [AnalyzedQuery]
   */
  public executeQuery(jql: AnalyzedQuery): TaskFn<IQueryResult> {
    return task => new CancelablePromise(() => this.engine.executeQuery(jql)(task), async (fn, resolve) => {
      // run query
      const result = await fn()

      // return
      this.emit('queried', jql)
      return resolve(result)
    })
  }
}
