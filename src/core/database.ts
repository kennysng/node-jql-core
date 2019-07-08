import { CancelablePromise } from '@kennysng/c-promise'
import { JQL } from 'node-jql'
import EventEmitter from 'wolfy87-eventemitter'
import { ReadWriteLock } from '../utils/lock'
import { DatabaseEngine } from './engine'
import { AnalyzedQuery } from './query'
import { IQueryResult, IUpdateResult } from './result'
import { StatusCode, TaskFn } from './task'

/**
 * Database instance
 */
export class Database extends EventEmitter {
  private readonly lock = new ReadWriteLock(0, 1)

  /**
   * @param name [string]
   * @param engine [DatabaseEngine] optional
   */
  constructor(public readonly name: string, private readonly engine: DatabaseEngine) {
    super()
  }

  /**
   * Create the database
   * @param jql [CreateDatabaseJQL]
   */
  public create(): TaskFn<IUpdateResult> {
    return task => new CancelablePromise(this.engine.createDatabase(this.name)(task), async (promise, resolve) => {
      // acquire write lock
      task.status(StatusCode.WAITING)
      await this.lock.write()

      try {
        // create database
        const result = await promise

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
    return task => new CancelablePromise(this.engine.dropDatabase(this.name)(task), async (promise, resolve) => {
      // acquire write lock
      task.status(StatusCode.WAITING)
      await this.lock.write()

      try {
        // drop database
        const result = await promise

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
    return task => new CancelablePromise(this.engine.executeUpdate(jql)(task), async (promise, resolve) => {
      // run query
      const result = await promise

      // return
      this.emit('updated', jql)
      return resolve(result)
    })
  }

  /**
   * Execute a select-related query
   * @param jql [Query]
   */
  public executeQuery(jql: AnalyzedQuery): TaskFn<IQueryResult> {
    return task => new CancelablePromise(this.engine.executeQuery(jql)(task), async (promise, resolve) => {
      // run query
      const result = await promise

      // return
      this.emit('queried', jql)
      return resolve(result)
    })
  }
}