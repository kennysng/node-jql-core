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
  public abstract async get<T = any>(key: string): Promise<T>

  /**
   * Move the cursor forward
   */
  public abstract async next(): Promise<boolean>
}
