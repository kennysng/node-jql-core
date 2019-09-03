import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

/**
 * Pay attention to the JavaScript precision problem
 */
export class RoundFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly roundType: 'ceil'|'floor'|'normal'|'truncate') {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): void {
    if (this.roundType === 'normal' || this.roundType === 'truncate') {
      if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(number, decimals)`)
    }
    else {
      if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)
    }

  }

  public run(parameters: CompiledParameterExpression[], value: any, decimals: number): number {
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
