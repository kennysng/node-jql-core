import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class TrigoConvertFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly convertType: 'radians-degrees'|'degrees-radians') {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)

  }

  public run(value: any): number {
    switch (this.convertType) {
      case 'radians-degrees':
        return +value * (180 / Math.PI)
      case 'degrees-radians':
        return +value * (Math.PI / 180)
    }
  }
}
