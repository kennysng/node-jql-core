import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class AsciiFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(character)`)

  }

  public run(parameters: CompiledParameterExpression[], value: any): number {
    const string = String(value)
    return string.length ? string.charCodeAt(0) : 0
  }
}
