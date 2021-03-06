import { checkNull, ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class LnFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly baseSupported = false) {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): void {
    if (this.baseSupported) {
      if (parameters.length < 1 || parameters.length > 2) throw new SyntaxError(`Invalid use of function ${this.name}([base, ]number)`)
    }
    else {
      if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)
    }

  }

  public run(parameters: CompiledParameterExpression[], arg1: any, arg2?: any): number {
    if (this.baseSupported && !checkNull(arg2)) {
      return Math.log(+arg2) / Math.log(+arg1)
    }
    else {
      return Math.log(+arg1)
    }
  }
}
