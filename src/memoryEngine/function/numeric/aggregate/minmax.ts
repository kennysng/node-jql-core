import { checkNull, ParameterExpression } from 'node-jql'
import { JQLAggregateFunction } from '../..'
import { CompiledParameterExpression } from '../../../expr/expressions/ParameterExpression'

export class MinMaxFunction extends JQLAggregateFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly target: 'max'|'min') {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(...args)`)

  }

  public run(parameters: CompiledParameterExpression[], ...args: any[]): number {
    args = args.filter(arg => !checkNull(arg))
    if (this.target === 'max') {
      return args.reduce((result, arg) => arg > result ? arg : result, Number.MIN_SAFE_INTEGER)
    }
    else {
      return args.reduce((result, arg) => arg < result ? arg : result, Number.MAX_SAFE_INTEGER)
    }
  }
}
