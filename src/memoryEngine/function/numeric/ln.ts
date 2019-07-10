import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import isUndefined from '../../../../src.old/utils/isUndefined'

export class LnFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly baseSupported = false) {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (this.baseSupported) {
      if (parameters.length < 1 || parameters.length > 2) throw new SyntaxError(`Invalid use of function ${this.name}([base, ]number)`)
    }
    else {
      if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)
    }
    return parameters
  }

  public run(arg1: any, arg2?: any): number {
    if (this.baseSupported && !isUndefined(arg2)) {
      return Math.log(+arg2) / Math.log(+arg1)
    }
    else {
      return Math.log(+arg1)
    }
  }
}
