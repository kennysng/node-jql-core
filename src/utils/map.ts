/**
 * Simple but not efficient Map with object key
 */
export class Map<K, V = any> {
  protected keys: K[] = []
  protected values: V[] = []

  constructor(public readonly equalFn: (l: K, r: K) => boolean = (l, r) => l === r) {
  }

  /**
   * Get the index of the given key
   * @param key [K]
   */
  public indexOfKey(key: K): number {
    return this.keys.findIndex(k => this.equalFn(key, k))
  }

  /**
   * Get the value by index
   * @param index [number]
   */
  public getValueAt(index: number): V {
    return this.values[index]
  }

  /**
   * Put the key-value pair into the Map
   * @param key [K]
   * @param value [V]
   */
  public put(key: K, value: V): Map<K, V> {
    const index = this.keys.length
    this.keys[index] = key
    this.values[index] = value
    return this
  }

  /**
   * Get the value of the given key from the Map
   * @param key [K]
   */
  public get(key: K): V|undefined {
    const index = this.indexOfKey(key)
    if (index === -1) return undefined
    return this.values[index]
  }
}
