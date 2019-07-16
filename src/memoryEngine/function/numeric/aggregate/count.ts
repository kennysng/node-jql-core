import _ = require('lodash')
import { checkNull, ParameterExpression } from 'node-jql'
import { JQLAggregateFunction } from '../..'

/**
 * Neither COUNT(*), COUNT(DISTINCT *) nor COUNT(DISTINCT col1, col2, ...) is supported
 */
export class CountFunction extends JQLAggregateFunction<number> {
  public readonly type = 'number'
  public $distinct: boolean = false

  public interpret(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of aggregate function ${this.name}(expression)`)
    if (parameters[0].prefix && parameters[0].prefix.toLocaleLowerCase() === 'distinct') this.$distinct = true
    return parameters
  }

  public run(...args: any[]): number {
    args = args.filter(row => Object.keys(row).reduce<boolean>((result, key) => result || !checkNull(row[key]), false))
    if (this.$distinct) args = _.uniqBy(args, arg => JSON.stringify(arg))
    return args.length
  }
}
