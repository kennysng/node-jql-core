import { Expression } from 'node-jql'
import { JQLFunction } from '..'

export class AsciiFunction extends JQLFunction<number> {
  public readonly type = 'number'

  public preprocess(extra: string, parameters: Expression[]): Expression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function 'ASCII(character)'`)
    return parameters
  }

  public run(value: any): number {
    const string = String(value)
    return string.length ? string.charCodeAt(0) : 0
  }
}
