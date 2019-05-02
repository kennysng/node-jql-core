import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class LetterCaseFunction extends JQLFunction<string> {
  public readonly type = 'string'

  constructor(protected readonly name: string, protected readonly lettercase: 'upper'|'lower') {
    super(name)
  }

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(text)`)
    return parameters
  }

  public run(value: any): string {
    return this.lettercase === 'lower' ? String(value).toLocaleLowerCase() : String(value).toLocaleUpperCase()
  }
}
