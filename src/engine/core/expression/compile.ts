import { AndExpressions, BetweenExpression, BinaryExpression, CaseExpression, ColumnExpression, ExistsExpression, Expression, FunctionExpression, InExpression, IsNullExpression, LikeExpression, OrExpressions, Unknown as Unknown_, Value as Value_ } from 'node-jql'
import { ICompilingQueryOptions } from '../compiledSql'
import { CompiledExpression } from '../expression'
import { CompiledBetweenExpression } from './between'
import { CompiledBinaryExpression } from './binary'
import { CompiledCaseExpression } from './case'
import { CompiledColumnExpression } from './column'
import { CompiledExistsExpression } from './exists'
import { CompiledGroupedExpressions } from './grouped'
import { CompiledInExpression } from './in'
import { CompiledIsNullExpression } from './isNull'
import { CompiledLikeExpression } from './like'
import { Unknown } from './unknown'
import { Value } from './value'

export function compile(expression: Expression, options: ICompilingQueryOptions): CompiledExpression {
  if (expression instanceof BetweenExpression) {
    return new CompiledBetweenExpression(expression, options)
  }
  else if (expression instanceof BinaryExpression) {
    return new CompiledBinaryExpression(expression, options)
  }
  else if (expression instanceof CaseExpression) {
    return new CompiledCaseExpression(expression, options)
  }
  else if (expression instanceof ColumnExpression) {
    return new CompiledColumnExpression(expression, options)
  }
  else if (expression instanceof ExistsExpression) {
    return new CompiledExistsExpression(expression, options)
  }
  /* TODO else if (expression instanceof FunctionExpression) {
    return new CompiledFunctionExpression(expression, options)
  } */
  else if (expression instanceof AndExpressions || expression instanceof OrExpressions) {
    return new CompiledGroupedExpressions(expression, options)
  }
  else if (expression instanceof InExpression) {
    return new CompiledInExpression(expression, options)
  }
  else if (expression instanceof IsNullExpression) {
    return new CompiledIsNullExpression(expression, options)
  }
  else if (expression instanceof LikeExpression) {
    return new CompiledLikeExpression(expression, options)
  }
  else if (expression instanceof Unknown_) {
    return new Unknown(expression, options)
  }
  else if (expression instanceof Value_) {
    return new Value(expression)
  }
  throw new SyntaxError(`Unknown expression '${expression.constructor.name}'`)
}
