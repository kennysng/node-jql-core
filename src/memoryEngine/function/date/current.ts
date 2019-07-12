import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class CurrentFunction extends JQLFunction<number> {
  public readonly type = 'Date'

  constructor(protected readonly name: string, protected readonly omitTime = false) {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length > 0) throw new SyntaxError(`Invalid use of function ${this.name}()`)
    return parameters
  }

  public run(): number {
    let mValue = moment.utc()
    if (this.omitTime) mValue = mValue.startOf('day')
    return mValue.toDate().getTime()
  }
}
