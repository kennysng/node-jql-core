import { ParameterExpression } from 'node-jql'
import seedrandom = require('seedrandom')
import { JQLFunction } from '..'

export class RandFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length > 1) throw new SyntaxError(`Invalid use of function ${this.name}(seed)`)
    return parameters
  }

  public run(seed?: string): number {
    return seedrandom(seed)()
  }
}
