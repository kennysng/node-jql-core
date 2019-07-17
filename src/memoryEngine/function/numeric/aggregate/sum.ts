import { checkNull, ParameterExpression } from 'node-jql'
import { JQLAggregateFunction } from '../..'

export class SumFunction extends JQLAggregateFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly avg = false) {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of aggregate function ${this.name}(expression)`)

  }

  public run(...args: number[]): number {
    args = args.filter(arg => !checkNull(arg))
    let result = args.reduce((result, arg) => {
      arg = +arg
      if (isNaN(arg)) arg = 0
      return result + arg
    }, 0)
    if (this.avg) result /= args.length
    return result
  }
}
