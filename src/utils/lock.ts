import { ClosedError } from './error/ClosedError'

export class ReadWriteLock {
  private readCount = 0
  private writeCount = 0
  private closed = false

  /**
   * @param maxReadCount [number] optional. maximum number of simultaneous reading process
   * @param maxWriteCount [number] optional. maximum number of simultaneous writing process
   */
  constructor(private readonly maxReadCount = 0, private readonly maxWriteCount = 0) {
  }

  /**
   * Whether someone is reading
   */
  get isReading(): boolean {
    return this.readCount > 0
  }

  /**
   * Whether someone is writing
   */
  get isWriting(): boolean {
    return this.writeCount > 0 && this.readCount === 0
  }

  // @override
  get [Symbol.toStringTag](): string {
    return ReadWriteLock.name
  }

  /**
   * Acquire read lock to avoid writing
   */
  public read(): Promise<void> {
    return new Promise((resolve, reject) => {
      const fn = () => {
        try {
          this.checkClosed()

          // wait until no one is writing and read count not reached
          if (!this.writeCount && (!this.maxReadCount || this.readCount < this.maxReadCount)) {
            this.readCount += 1
            return resolve()
          }
          setTimeout(fn, 0)
        }
        catch (e) {
          return reject(e)
        }
      }
      fn()
    })
  }

  /**
   * Release read lock
   */
  public readEnd(): void {
    this.checkClosed()
    this.readCount = Math.max(0, this.readCount - 1)
  }

  /**
   * Acquire write lock to avoid reading
   */
  public write(): Promise<void> {
    return new Promise((resolve, reject) => {
      const fn1 = () => {
        try {
          this.checkClosed()

          // wait until write count not reached
          if (!this.maxWriteCount || this.writeCount < this.maxWriteCount) {
            this.writeCount += 1
            const fn2 = () => {
              try {
                this.checkClosed()

                // wait until no one is reading
                if (!this.readCount) return resolve()
                setTimeout(fn2, 0)
              }
              catch (e) {
                return reject(e)
              }
            }
            return fn2()
          }
          setTimeout(fn1, 0)
        }
        catch (e) {
          return reject(e)
        }
      }
      fn1()
    })
  }

  /**
   * Release write lock
   */
  public writeEnd(): void {
    this.checkClosed()
    this.writeCount = Math.max(0, this.writeCount - 1)
  }

  /**
   * No further reading or writing
   */
  public close(): void {
    this.checkClosed()
    this.closed = true
  }

  private checkClosed(): void {
    if (this.closed) throw new ClosedError('ReadWriteLock already closed')
  }
}
