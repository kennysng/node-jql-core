import { ParameterExpression } from 'node-jql'
import { JQLFunction } from '..'
import { CompiledParameterExpression } from '../../expr/expressions/ParameterExpression'

export class TrigoFunction extends JQLFunction<number> {
  public readonly type = 'number'

  constructor(protected readonly name: string, protected readonly trigoType: 'sin'|'cos'|'tan'|'cot') {
    super(name)
  }

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of function ${this.name}(number)`)

  }

  public run(parameters: CompiledParameterExpression[], value: any): number {
    switch (this.trigoType) {
      case 'sin':
        return Math.sin(+value)
      case 'cos':
        return Math.cos(+value)
      case 'tan':
        return Math.tan(+value)
      case 'cot':
        return 1 / Math.tan(+value)
    }
  }
}
