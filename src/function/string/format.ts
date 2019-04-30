import { ParameterExpression } from 'node-jql'
import numeral = require('numeral')
import { JQLFunction } from '..'

export class FormatFunction extends JQLFunction<string> {
  public readonly type = 'string'

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(number, decimal_places)`)
    return parameters
  }

  public run(value: number, dp: number): string {
    let format = '0,0'
    for (let i = 0; i < dp; i += 1) {
      if (i === 0) format += '.'
      format += '0'
    }
    return numeral(value).format(format)
  }
}
