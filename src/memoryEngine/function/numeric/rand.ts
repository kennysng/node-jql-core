import { ParameterExpression } from 'node-jql'
import seedrandom = require('seedrandom')
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class RandFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length > 1) throw new SyntaxError(`Invalid use of function ${this.name}(seed)`)

  }

  public run(parameters: CompiledParameterExpression[], seed?: string): number {
    return seedrandom(seed)()
  }
}
