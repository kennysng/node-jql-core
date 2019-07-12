import { CancelablePromise } from '@kennysng/c-promise'
import { JQL } from 'node-jql'
import uuid = require('uuid/v4')
import EventEmitter from 'wolfy87-eventemitter'
import { TaskError } from '../utils/error/TaskError'

/**
 * Status function
 */
export type TaskFn<T> = (task: Task<T>) => CancelablePromise<T>

/**
 * Represent a task
 */
export class Task<T = any> extends EventEmitter {
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

  /**
   * @param jql [JQL]
   * @param fn [Function] Create Promise from task
   */
  constructor(public readonly jql: JQL, fn: TaskFn<T>) {
    super()
    this.promise = fn(this)
  }

  /**
   * Change task status
   * @param statusCode [StatusCode]
   */
  public status(statusCode: StatusCode): Task<T> {
    if (this.statusCode.valueOf() > statusCode.valueOf()) {
      throw new TaskError(`Status code cannot roll back from ${StatusCode[this.statusCode]} to ${StatusCode[statusCode]}`)
    }
    this.emit(StatusCode[statusCode].toLocaleLowerCase())
    return this
  }

  // @override
  public toString(): string {
    return this.jql ? this.jql.toString() : `Task#${this.id}`
  }
}

/**
 * Definition of the status code
 */
export enum StatusCode {
  /**
   * e.g. Pre-compiling
   */
  PREPARING,

  /**
   * e.g. Waiting for databases or tables
   */
  WAITING,

  /**
   * Processing
   */
  RUNNING,

  /**
   * e.g. Releasing databases or tables
   */
  ENDING,

  /**
   * Result returned
   */
  COMPLETED,
}
