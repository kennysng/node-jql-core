/**
 * Simulate Cursor in Java in order to reduce the memory usage
 */
export interface ICursor {
  /**
   * Get the value of the given key from the current row
   * @param key [string]
   */
  get(key: string): any

  /**
   * Move to next column. Throw error if reaches the end
   */
  next(): Promise<ICursor>
}
