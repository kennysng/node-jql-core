import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class ModFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(x, y)`)
    return parameters
  }

  public run(x: any, y: any): number {
    return +x % +y
  }
}
