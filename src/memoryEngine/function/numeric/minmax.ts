import { checkNull, ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class MinMaxFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly target: 'max'|'min') {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(...args)`)
    return parameters
  }

  public run(...args: any[]): number {
    args = args.filter(arg => !checkNull(arg))
    if (this.target === 'max') {
      return args.reduce((result, arg) => arg > result ? arg : result, Number.MIN_SAFE_INTEGER)
    }
    else {
      return args.reduce((result, arg) => arg < result ? arg : result, Number.MAX_SAFE_INTEGER)
    }
  }
}
