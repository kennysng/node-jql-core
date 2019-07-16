import { CompiledAndExpressions } from './AndExpressions'
import { CompiledBetweenExpression } from './BetweenExpression'
import { CompiledBinaryExpression } from './BinaryExpression'
import { CompiledCaseExpression } from './CaseExpression'
import { CompiledColumnExpression } from './ColumnExpression'
import { CompiledExistsExpression } from './ExistsExpression'
import { CompiledFunctionExpression } from './FunctionExpression'
import { CompiledInExpression } from './InExpression'
import { CompiledIsNullExpression } from './IsNullExpression'
import { CompiledLikeExpression } from './LikeExpression'
import { CompiledMathExpression } from './MathExpression'
import { CompiledOrExpressions } from './OrExpressions'
import { CompiledParameterExpression } from './ParameterExpression'
import { CompiledUnknown } from './Unknown'
import { CompiledValue } from './Value'

export const expressions = {
  AndExpressions: CompiledAndExpressions,
  BetweenExpression: CompiledBetweenExpression,
  BinaryExpression: CompiledBinaryExpression,
  CaseExpression: CompiledCaseExpression,
  ColumnExpression: CompiledColumnExpression,
  ExistsExpression: CompiledExistsExpression,
  FunctionExpression: CompiledFunctionExpression,
  InExpression: CompiledInExpression,
  IsNullExpression: CompiledIsNullExpression,
  LikeExpression: CompiledLikeExpression,
  MathExpression: CompiledMathExpression,
  OrExpressions: CompiledOrExpressions,
  ParameterExpression: CompiledParameterExpression,
  Unknown: CompiledUnknown,
  Value: CompiledValue,
}
