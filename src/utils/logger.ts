/* tslint:disable:no-console */

import chalk = require('chalk')
import moment = require('moment')
import { getEnv } from './env'

type LogLevel = 'DEBUG'|'INFO'|'WARN'|'ERROR'

/**
 * Advanced logging
 */
export class Logger {
  private readonly tag: string
  private levels: LogLevel[]

  /**
   * @param key [string]
   */
  constructor(key: string) {
    this.tag = `node-jql:${key}`

    const levels = (getEnv('log') || 'DEBUG,INFO,WARN,ERROR').split(',')
    this.setLogLevels(...levels as LogLevel[])
  }

  // @override
  get [Symbol.toStringTag](): string {
    return 'Logger'
  }

  /**
   * The list of levels that will be shown
   * @param levels [...Array<string>] Accepts DEBUG, INFO, WARN, ERROR only
   */
  public setLogLevels(...levels: LogLevel[]): void {
    this.levels = levels
  }

  /**
   * Same as console.debug
   * @param args [any]
   */
  public debug(...args: any[]): void {
    this.print('DEBUG', ...args)
  }

  /**
   * Same as console.info
   * @param args [any]
   */
  public info(...args: any[]): void {
    this.print('INFO', ...args)
  }

  /**
   * Same as console.warn
   * @param args [any]
   */
  public warn(...args: any[]): void {
    this.print('WARN', ...args)
  }

  /**
   * Same as console.error
   * @param args [any]
   */
  public error(...args: any[]): void {
    this.print('ERROR', ...args)
  }

  private print(level: LogLevel, ...args: any[]): void {
    if (this.levels.indexOf(level) > -1) {
      switch (level) {
        case 'DEBUG':
          args.unshift(chalk.default.gray(this.tag))
          args.unshift(chalk.default.bgBlackBright('[DEBUG]'))
          args.unshift(moment.utc().format('YYYY-MM-DD HH:mm:ss'))
          console.debug(...args)
          break
        case 'INFO':
          args.unshift(this.tag)
          args.unshift(chalk.default.inverse('[INFO]'))
          args.unshift(moment.utc().format('YYYY-MM-DD HH:mm:ss'))
          console.info(...args)
          break
        case 'WARN':
          args.unshift(chalk.default.yellow(this.tag))
          args.unshift(chalk.default.bgYellow('[WARN]'))
          args.unshift(moment.utc().format('YYYY-MM-DD HH:mm:ss'))
          console.warn(...args)
          break
        case 'ERROR':
          args.unshift(chalk.default.red(this.tag))
          args.unshift(chalk.default.bgRed('[ERROR]'))
          args.unshift(moment.utc().format('YYYY-MM-DD HH:mm:ss'))
          console.error(...args)
          break
      }
    }
  }
}
