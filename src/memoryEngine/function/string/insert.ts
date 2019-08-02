import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

/**
 * Note that @params position uses 0-based index
 */
export class InsertFunction extends JQLFunction<string> {
  public readonly type = 'string'

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 4) throw new SyntaxError(`Invalid use of function ${this.name}(target, position, number, value)`)

  }

  public run(target: any, start: number, length: number, value: any): string {
    return String(target).substr(0, start) + String(value) + target.substr(start + 1 + length)
  }
}
