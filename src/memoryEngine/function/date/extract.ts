import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'
import { GetUnit } from '../interface'

/**
 * microsecond is not supported in JavaScript
 */
export class ExtractFunction extends JQLFunction<number> {
  public readonly type = 'number'
  private unit: GetUnit = 'day'

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1 && parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(part FROM date, format?)`)
    if (!parameters[0].prefix || !parameters[0].prefix.endsWith(' FROM')) throw new SyntaxError(`Invalid use of function ${this.name}(part FROM date, format?)`)
    this.unit = parameters[0].prefix.substring(0, parameters[0].prefix.length - 5) as GetUnit
  }

  // @override
  public run(parameters: CompiledParameterExpression[], value: any, format?: string): number {
    return moment.utc(value, format).get(this.unit)
  }
}
