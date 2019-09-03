import { ParameterExpression } from 'node-jql'
import numeral = require('numeral')
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class FormatFunction extends JQLFunction<string> {
  public readonly type = 'string'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(number, decimal_places)`)

  }

  public run(parameters: CompiledParameterExpression[], value: number, dp: number): string {
    let format = '0,0'
    for (let i = 0; i < dp; i += 1) {
      if (i === 0) format += '.'
      format += '0'
    }
    return numeral(value).format(format)
  }
}
