import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'

export class SubstrFunction extends JQLFunction<string> {
  public readonly type = 'string'

  constructor(protected readonly name: string, protected readonly startType: 'left'|'right'|'normal' = 'normal') {
    super(name)
  }

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (this.startType === 'normal') {
      if (parameters.length !== 3) throw new SyntaxError(`Invalid use of function ${this.name}(string, start, length)`)
    }
    else {
      if (parameters.length !== 2) throw new SyntaxError(`Invalid use of function ${this.name}(string, number_of_chars)`)
    }
    return parameters
  }

  public run(value: any, arg1: number, arg2: number): string {
    switch (this.startType) {
      case 'left':
        return String(value).substr(0, arg1)
      case 'right':
        value = String(value)
        return value.substr((value as string).length - arg1)
      case 'normal':
        return String(value).substr(arg1, arg2)
    }
  }
}
