import { ParameterExpression } from 'node-jql'
import numeral from 'numeral'
import { JQLFunction } from '..'

export class NumberFormatFunction extends JQLFunction<string> {
  public readonly type = 'string'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(date, format)`)
  }

  // @override
  public run(value: number, format: string): string {
    if (isNaN(value)) return 'NaN'
    const nValue = numeral(value)
    return isNaN(nValue.value()) ? 'NaN' : nValue.format(format)
  }
}
