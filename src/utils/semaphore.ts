import semaphore = require('semaphore')

/**
 * Extended Semaphore
 */
export class Semaphore {
  private readonly semaphore: semaphore.Semaphore

  constructor(n?: number) {
    this.semaphore = semaphore(n)
  }

  /**
   * Check if the semaphore is available
   * @param n [number]
   */
  public available(n: number = 1): boolean {
    return this.semaphore.available(n)
  }

  /**
   * Acquire for the semaphore
   * @param n [number]
   */
  public acquire(n: number = 1): Promise<void> {
    return new Promise(resolve => {
      this.semaphore.take(n, () => resolve())
    })
  }

  /**
   * Release the semaphore
   * @param n [number]
   */
  public release(n: number = 1): void {
    this.semaphore.leave(n)
  }

  /**
   * Wait until the semaphore is available
   * @param n [number]
   */
  public wait(n: number = 1): Promise<void> {
    return new Promise(resolve => {
      const tickFn = () => this.available(n) ? resolve() : setTimeout(tickFn, 0)
      tickFn()
    })
  }
}
