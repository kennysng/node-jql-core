export class Map<K, V> {
  protected keys: K[] = []
  protected values: V[] = []

  constructor(public readonly equalFn: (l: K, r: K) => boolean = (l, r) => l === r) {
  }

  public indexOfKey(key: K): number {
    return this.keys.findIndex(k => this.equalFn(key, k))
  }

  public getValueAt(index: number): V {
    return this.values[index]
  }

  public put(key: K, value: V): Map<K, V> {
    const index = this.keys.length
    this.keys[index] = key
    this.values[index] = value
    return this
  }

  public get(key: K): V | undefined {
    const index = this.indexOfKey(key)
    if (index === -1) return undefined
    return this.values[index]
  }
}
