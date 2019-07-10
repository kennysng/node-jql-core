import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class PadFunction extends JQLFunction<string> {
  public readonly type = 'string'

  constructor(protected readonly name: string, protected readonly position: 'left'|'right') {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(string, length, ${this.position === 'left' ? 'l' : 'r'}pad_string)`)
    return parameters
  }

  public run(value: any, length: number, pad: any): string {
    value = String(value)
    pad = String(pad)
    let i = 0
    while (value.length < length) {
      const char = (pad as string).charAt(i)
      value = this.position === 'left' ? char + value : value + char
      i = (i + 1) % pad
    }
    return value
  }
}
