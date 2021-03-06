import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class ConcatFunction extends JQLFunction<string> {
  public readonly type = 'string'

  constructor(protected readonly name: string, protected readonly separatorSupported = false) {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): void {
    if (this.separatorSupported) {
      if (parameters.length < 2) throw new SyntaxError(`Invalid use of function ${this.name}(separator, ...expressions)`)
    }
    else {
      if (parameters.length < 1) throw new SyntaxError(`Invalid use of function ${this.name}(...expressions)`)
    }

  }

  public run(parameters: CompiledParameterExpression[], ...args: any[]): string {
    let separator = ''
    if (this.separatorSupported) {
      separator = String(args[0])
      args = args.slice(1)
    }
    return args.map(arg => String(arg)).join(separator)
  }
}
