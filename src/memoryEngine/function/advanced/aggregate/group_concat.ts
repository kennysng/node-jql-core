import _ = require('lodash')
import { checkNull, ParameterExpression } from 'node-jql'
import { JQLAggregateFunction } from '../..'
import { CompiledParameterExpression } from '../../../expr/expressions/ParameterExpression'

export class GroupConcatFunction extends JQLAggregateFunction<string> {
  public readonly type = 'string'
  private $distinct = false
  private $separator = ','

  public interpret(parameters: ParameterExpression[]): void {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of aggregate function ${this.name}(expression)`)
    if (parameters[0].prefix && parameters[0].prefix.toLocaleLowerCase() === 'distinct') this.$distinct = true
    if (parameters[0].suffix && parameters[0].suffix.toLocaleLowerCase().startsWith('SEPARATOR')) this.$separator = parameters[0].suffix.substr(10)
  }

  public run(parameters: CompiledParameterExpression[], ...args: string[]): string {
    args = args.filter(arg => !checkNull(arg))
    if (this.$distinct) args = _.uniqBy(args, arg => JSON.stringify(arg))
    return args.join(this.$separator)
  }
}
