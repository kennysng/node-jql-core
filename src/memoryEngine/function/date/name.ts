import moment = require('moment')
import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class NameFunction extends JQLFunction<string> {
  public readonly type = 'string'

  constructor(protected readonly name: string, private readonly format: string) {
    super(name)
  }

  // @override
  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1 && parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(value, format?)`)
  }

  // @override
  public run(parameters: CompiledParameterExpression[], value: any, format?: string): string {
    return moment.utc(value, format).format(this.format)
  }
}
