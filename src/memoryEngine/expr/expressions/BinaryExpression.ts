import { BinaryExpression as NodeJQLBinaryExpression, BinaryOperator, Expression, IBinaryExpression } from 'node-jql'
import squel = require('squel')
import { CompiledConditionalExpression, CompiledExpression } from '..'
import { InMemoryDatabaseEngine } from '../..'
import { Cursor } from '../../cursor'
import { Sandbox } from '../../sandbox'
import { compile, ICompileOptions } from '../compile'

/**
 * Analyze BinaryExpression
 */
export class BinaryExpression extends CompiledConditionalExpression implements IBinaryExpression {
  public readonly classname = BinaryExpression.name

  public readonly left: CompiledExpression
  public readonly right: any

  /**
   * @param engine [InMemoryDatabaseEngine]
   * @param jql [NodeJQLBinaryExpression]
   * @param options [ICompileOptions]
   */
  constructor(engine: InMemoryDatabaseEngine, protected readonly jql: NodeJQLBinaryExpression, options: ICompileOptions) {
    super()
    this.left = compile(engine, jql.left, options)
    if (jql.right instanceof Expression) this.right = compile(engine, jql.right, options)
  }

  // @override
  get $not(): boolean|undefined {
    return this.jql.$not
  }

  // @override
  get operator(): BinaryOperator {
    return this.jql.operator
  }

  // @override
  public validate(availableTables: string[]): void {
    this.jql.validate(availableTables)
  }

  // @override
  public toSquel(): squel.Expression {
    return this.jql.toSquel()
  }

  // @override
  public toJson(): IBinaryExpression {
    return this.jql.toJson()
  }

  // @override
  public async evaluate(sandbox: Sandbox, cursor: Cursor): Promise<boolean> {
    if (this.right !== null && this.right instanceof CompiledExpression) {
      const [left, right] = await Promise.all([
        this.left.evaluate(sandbox, cursor),
        this.right.evaluate(sandbox, cursor),
      ])
      try {
        switch (this.operator) {
          case '<':
            return left < right
          case '<=':
            return left <= right
          case '<>':
            return left !== right
          case '=':
            return left === right
          case '>':
            return left > right
          case '>=':
            return left >= right
        }
      }
      catch (e) {
        // do nothing
      }
    }
    return false
  }
}
