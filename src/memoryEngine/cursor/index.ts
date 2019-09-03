/**
 * Simulate Java's Cursor class
 */
export abstract class Cursor {
  /**
   * Move the cursor to the head
   */
  public abstract async moveToFirst(): Promise<boolean>

  /**
   * Get the targeted value
   * @param key [string]
   */
  public abstract async get<T = any>(key: string): Promise<T|undefined>

  /**
   * Move the cursor forward
   */
  public abstract async next(): Promise<boolean>
}

/**
 * Cursor for array
 */
export class ArrayCursor<T = any> extends Cursor {
  protected index = -1

  /**
   * @param array [Array<T>]
   */
  constructor(protected readonly array: T[]) {
    super()
  }

  get row(): T {
    return this.array[this.index]
  }

  /**
   * Result length
   */
  get length(): number {
    return this.array.length
  }

  // @override
  public async moveToFirst(): Promise<boolean> {
    this.index = -1
    return this.next()
  }

  // @override
  public async get<T = any>(key: string): Promise<T|undefined> {
    return this.array[this.index][key]
  }

  // @override
  public async next(): Promise<boolean> {
    this.index = Math.min(this.array.length, this.index + 1)
    return this.index < this.array.length
  }
}
