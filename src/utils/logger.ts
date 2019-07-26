/* tslint:disable:no-console */

import chalk from 'chalk'
import moment from 'moment'

/**
 * Logger interface
 */
export interface ILogger {
  /**
   * console.log
   * @param args [Array<string>]
   */
  log: (...args: string[]) => void

  /**
   * console.debug
   * @param args [Array<string>]
   */
  debug: (...args: string[]) => void

  /**
   * console.info
   * @param args [Array<string>]
   */
  info: (...args: string[]) => void

  /**
   * console.warn
   * @param args [Array<string>]
   */
  warn: (...args: string[]) => void

  /**
   * console.error
   * @param args [Array<string>]
   */
  error: (...args: string[]) => void
}

type LogLevel = 'debug'|'log'|'info'|'warn'|'error'

/**
 * Simple logger class
 */
export class Logger implements ILogger {
  /**
   * @param tag [string]
   */
  constructor(private readonly tag: string) {
  }

  // @override
  public log(...args: string[]): void {
    this.print('log', ...args)
  }

  // @override
  public debug(...args: string[]): void {
    this.print('debug', ...args)
  }

  // @override
  public info(...args: string[]): void {
    this.print('info', ...args)
  }

  // @override
  public warn(...args: string[]): void {
    this.print('warn', ...args)
  }

  // @override
  public error(...args: string[]): void {
    this.print('error', ...args)
  }

  private print(level: LogLevel, ...args: string[]): void {
    args.unshift(chalk.bold(`[${level.toLocaleUpperCase()}]`))
    args = this.wrap(level, ...args)
    args.unshift(chalk.italic(this.tag))
    args.unshift(chalk.grey(moment.utc().format()))
    switch (level) {
      case 'log':
        return console.log(...args)
      case 'debug':
        return console.debug(...args)
      case 'info':
        return console.info(...args)
      case 'warn':
        return console.warn(...args)
      case 'error':
        return console.error(...args)
    }
  }

  private wrap(level: LogLevel, ...args: string[]): string[] {
    switch (level) {
      case 'log':
      case 'debug':
        return args.map(arg => chalk.gray(arg))
      case 'info':
        return args
      case 'warn':
        return args.map(arg => chalk.yellow(arg))
      case 'error':
        return args.map(arg => chalk.red(arg))
    }
  }
}
