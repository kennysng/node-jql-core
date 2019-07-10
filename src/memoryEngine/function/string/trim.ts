import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class TrimFunction extends JQLFunction<string> {
  public readonly type = 'string'

  constructor(protected readonly name: string, protected readonly trimType: 'left'|'right'|'both') {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(string)`)
    return parameters
  }

  public run(value: any): string {
    switch (this.trimType) {
      case 'left':
        return String(value).trimLeft()
      case 'right':
        return String(value).trimRight()
      case 'both':
        return String(value).trim()
    }
  }
}
