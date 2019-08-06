import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class LocateFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly startSupported = true) {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): void {
    if (this.startSupported) {
      if (parameters.length < 2 || parameters.length > 3) throw new SyntaxError(`Invalid use of function ${this.name}(target, source, start)`)
    }
    else {
      if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(target, source)`)
    }

  }

  public run(parameters: CompiledParameterExpression[], target: any, source: any, start = 0): number {
    if (!this.startSupported) start = 0
    return String(source).toLocaleLowerCase().indexOf(String(target).toLocaleLowerCase(), start)
  }
}
