import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { GetUnit } from '../interface'

export class GetFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, private readonly unit: GetUnit) {
    super(name)
  }

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1 && parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(value, format?)`)
  }

  // @override
  public run(value: any, format?: string): number {
    return moment.utc(value, format).get(this.unit)
  }
}
