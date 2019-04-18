import { JQLFunction } from '.'
import { AlreadyExistsError } from '../utils/error/AlreadyExistsError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { CountFunction } from './numeric/count'
import { SumFunction } from './numeric/sum'
import { AsciiFunction } from './string/ascii'
import { ConcatFunction } from './string/concat'

export class Functions {
  private readonly functions: { [key: string]: () => JQLFunction } = {}
  private readonly timestamp: { [key: string]: number } = {}

  constructor(private readonly parent?: Functions) {
    // numeric functions
    this.register('count', () => new CountFunction())
    this.register('sum', () => new SumFunction())

    // string functions
    this.register('ascii', () => new AsciiFunction())
    this.register('concat', () => new ConcatFunction())
  }

  public register(name: string, jqlFunction: () => JQLFunction, ifNotExists?: true): void {
    const name_ = name.toLocaleLowerCase()
    if (this.functions[name_] && ifNotExists) throw new AlreadyExistsError(`Function '${name}' already exists`)
    this.functions[name_] = jqlFunction
    this.timestamp[name_] = Date.now()
  }

  public get(name: string): JQLFunction {
    if (this.parent) {
      const lastModified = [this.getLastModified(name), this.parent.getLastModified(name)]
      if (lastModified[0] === lastModified[1] && lastModified[1] === 0) throw new NotFoundError(`Function '${name}' not found`)
      return lastModified[0] >= lastModified[1] ? this.get_(name) : this.parent.get(name)
    }
    return this.get_(name)
  }

  private get_(name: string): JQLFunction {
    const fn = this.functions[name.toLocaleLowerCase()]
    if (!fn) throw new NotFoundError(`Function '${name}' not found`)
    return fn()
  }

  private getLastModified(name: string): number {
    return this.timestamp[name.toLocaleLowerCase()] || 0
  }
}
