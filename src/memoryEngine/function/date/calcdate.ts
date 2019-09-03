import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'
import { CalcUnit } from '../interface'

/**
 * microsecond is not supported in JavaScript
 */
export class CalcDateFunction extends JQLFunction<number> {
  public readonly type = 'Date'
  private unit: CalcUnit = 'day'

  constructor(protected readonly name: string, protected readonly calcType: 'add'|'sub') {
    super(name)
  }

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 2 && parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(date, days, format?)`)
    if (parameters[1].prefix && parameters[1].prefix.toLocaleLowerCase() === 'interval') {
      if (!parameters[1].suffix) throw new SyntaxError(`Invalid use of function ${this.name}(date, INTERVAL value unit)`)
      this.unit = parameters[1].suffix.toLocaleLowerCase() as CalcUnit
    }
  }

  // @override
  public run(parameters: CompiledParameterExpression[], value: any, count: number, format?: string): number {
    let mValue = moment.utc(value, format)
    if (this.calcType === 'add') {
      mValue = mValue.add(count, this.unit)
    }
    else {
      mValue = mValue.subtract(count, this.unit)
    }
    return mValue.toDate().getTime()
  }
}
