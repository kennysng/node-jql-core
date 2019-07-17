import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class SubstrIndexFunction extends JQLFunction<string> {
  public readonly type = 'string'

  constructor(protected readonly name: string) {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(string, delimiter, number)`)

  }

  public run(value: any, delimiter: any, count: number): string {
    value = String(value)
    delimiter = String(delimiter)
    const length = value.length
    let i = -1
    while (count-- && i++ < length) {
        i = value.indexOf(delimiter, i)
        if (i < 0) break
    }
    return value.substr(0, i)
  }
}
