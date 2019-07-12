import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class LnWithBaseFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly base: number) {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)
    return parameters
  }

  public run(value: any): number {
    return Math.log(+value) / Math.log(this.base)
  }
}
