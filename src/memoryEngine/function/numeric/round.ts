import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

/**
 * Pay attention to the JavaScript precision problem
 */
export class RoundFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly roundType: 'ceil'|'floor'|'normal'|'truncate') {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (this.roundType === 'normal' || this.roundType === 'truncate') {
      if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(number, decimals)`)
    }
    else {
      if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)
    }
    return parameters
  }

  public run(value: any, decimals: number): number {
    switch (this.roundType) {
      case 'ceil':
        return Math.ceil(+value)
      case 'floor':
        return Math.floor(+value)
      case 'normal': {
        const base = Math.pow(10, decimals)
        return Math.round(+value * base) / base
      }
      case 'truncate': {
        const base = Math.pow(10, decimals)
        return Math.floor(+value * base) / base
      }
    }
  }
}
