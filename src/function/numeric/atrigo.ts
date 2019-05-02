import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class ATrigoFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly trigoType: 'sin'|'cos'|'tan') {
    super(name)
  }

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)
    return parameters
  }

  public run(value: any): number {
    switch (this.trigoType) {
      case 'sin':
        return Math.asin(+value)
      case 'cos':
        return Math.acos(+value)
      case 'tan':
        return Math.atan(+value)
    }
  }
}
