import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class LetterCaseFunction extends JQLFunction<string> {
  public readonly type = 'string'

  constructor(protected readonly name: string, protected readonly lettercase: 'upper'|'lower') {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(text)`)

  }

  public run(parameters: CompiledParameterExpression[], value: any): string {
    return this.lettercase === 'lower' ? String(value).toLocaleLowerCase() : String(value).toLocaleUpperCase()
  }
}
