import _ = require('lodash')
import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'
import { CalcUnit } from '../interface'

export class TimestampDiffFunction extends JQLFunction<number> {
  public readonly type = 'number'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(unit, expression, expression)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], unit: string, l: number, r: number): number {
    const lMoment = moment(l)
    const rMoment = moment(r)
    return lMoment.diff(rMoment, unit.toLocaleLowerCase() as CalcUnit)
  }
}
