import _ = require('lodash')
import { ParameterExpression } from 'node-jql'
import { JQLAggregateFunction } from '../..'
import isUndefined from '../../../utils/isUndefined'

/**
 * Neither COUNT(*), COUNT(DISTINCT *) nor COUNT(DISTINCT col1, col2, ...) is supported
 */
export class CountFunction extends JQLAggregateFunction<number> {
  public readonly type = 'number'
  public $distinct: boolean = false

  public preprocess(parameters: ParameterExpression[]): ParameterExpression[] {
    if (parameters.length !== 1) throw new SyntaxError(`Invalid use of aggregate function ${this.name}(expression)`)
    if (parameters[0].prefix && parameters[0].prefix.toLocaleLowerCase() === 'distinct') this.$distinct = true
    return parameters
  }

  public run(...args: any[]): number {
    args = args.filter(arg => !isUndefined(arg))
    if (this.$distinct) args = _.uniq(args)
    return args.length
  }
}
