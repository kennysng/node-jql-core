/**
 * Advanced error handling. Supports error hierarchy
 */
export class JQLError extends Error {
  public readonly name: string

  /**
   * @param message [string]
   * @param error [Error]
   */
  constructor(message: string, error?: Error)

  /**
   * @param name [name]
   * @param message [name]
   * @param error [Error]
   */
  constructor(name: string, message: string, error?: Error)

  constructor(...args: any[]) {
    super(typeof args[1] === 'string' ? `${args[0]}: ${args[1]}` : `JQLError: ${args[0]}`)
    let name: string, error: Error|undefined
    if (typeof args[1] === 'string') {
      name = args[0]
      error = args[2]
    }
    else {
      name = 'JQLError'
      error = args[1]
    }
    this.name = name
    if (error) this.stack = `${this.stack}\n--------------------\nThrown by ${error.stack}`
  }

  // @override
  get [Symbol.toStringTag]() {
    return this.name
  }
}
