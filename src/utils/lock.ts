/**
 * Similar to a Semaphore
 * Avoid concurrent reading and writing to avoid data collision
 */
export class ReadWriteLock {
  private reading = 0
  private writing = false

  // @override
  get [Symbol.toStringTag](): string {
    return 'ReadWriteLock'
  }

  /**
   * Wait if someone is writing
   * Mark down that someone is reading
   */
  public startReading(): Promise<void> {
    return new Promise(resolve => {
      const fn = () => {
        if (!this.writing) {
          this.reading += 1
          return resolve()
        }
        setTimeout(fn, 1)
      }
      fn()
    })
  }

  /**
   * Someone ends reading
   */
  public endReading(): void {
    this.reading = Math.max(0, this.reading - 1)
  }

  /**
   * Wait if someone is writing
   * Hold the writing flag and wait until no one is reading
   */
  public startWriting(): Promise<void> {
    return new Promise(resolve => {
      const fn = () => {
        if (!this.writing) {
          this.writing = true
          const fn_ = () => {
            if (!this.reading) return resolve()
            setTimeout(fn_, 1)
          }
          return fn_()
        }
        setTimeout(fn, 1)
      }
      fn()
    })
  }

  /**
   * Someone ends writing
   */
  public endWriting(): void {
    this.writing = false
  }
}

/**
 * Manage multiple read-write locks
 */
export class ReadWriteLocks {
  private readonly locks: { [key: string]: ReadWriteLock } = {}

  // @override
  get [Symbol.toStringTag](): string {
    return 'ReadWriteLocks'
  }

  public startReading(key: string): Promise<void> {
    if (!this.locks[key]) this.locks[key] = new ReadWriteLock()
    return this.locks[key].startReading()
  }

  public endReading(key: string): void {
    if (this.locks[key]) this.locks[key].endReading()
  }

  public startWriting(key: string): Promise<void> {
    if (!this.locks[key]) this.locks[key] = new ReadWriteLock()
    return this.locks[key].startWriting()
  }

  public endWriting(key: string): void {
    if (this.locks[key]) this.locks[key].endWriting()
  }
}
