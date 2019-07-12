import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class LocateFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly startSupported = true) {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (this.startSupported) {
      if (parameters.length < 2 || parameters.length > 3) throw new SyntaxError(`Invalid use of function ${this.name}(target, source, start)`)
    }
    else {
      if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(target, source)`)
    }
    return parameters
  }

  public run(target: any, source: any, start = 0): number {
    if (!this.startSupported) start = 0
    return String(source).toLocaleLowerCase().indexOf(String(target).toLocaleLowerCase(), start)
  }
}
