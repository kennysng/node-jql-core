import { JQLFunction } from '.'
import { AnyValueFunction } from './advanced/aggregate/any_value'
import { FindFunction } from './advanced/aggregate/find'
import { GroupConcatFunction } from './advanced/aggregate/group_concat'
import { RowsFunction } from './advanced/aggregate/rows'
import { BinFunction } from './advanced/bin'
import { CoalesceFunction } from './advanced/coalesce'
import { ConvFunction } from './advanced/conv'
import { IfFunction } from './advanced/if'
import { IfNullFunction } from './advanced/if_null'
import { IndexOfFunction } from './advanced/indexof'
import { IsNullFunction } from './advanced/is_null'
import { NullIfFunction } from './advanced/nullif'
import { StringFunction } from './advanced/string'
import { CalcDateFunction } from './date/calcdate'
import { CalcTimeFunction } from './date/calctime'
import { CurrentFunction } from './date/current'
import { DateFunction } from './date/date'
import { DateFormatFunction } from './date/date_format'
import { DiffFunction } from './date/diff'
import { ExtractFunction } from './date/extract'
import { FromDaysFunction } from './date/from_days'
import { GetFunction } from './date/get'
import { LastDayFunction } from './date/last_day'
import { MakeDateFunction } from './date/makedate'
import { MakeTimeFunction } from './date/maketime'
import { NameFunction } from './date/name'
import { NowFunction } from './date/now'
import { TimestampDiffFunction } from './date/timestamp_diff'
import { AbsFunction } from './numeric/abs'
import { CountFunction } from './numeric/aggregate/count'
import { MinMaxFunction } from './numeric/aggregate/minmax'
import { SumFunction } from './numeric/aggregate/sum'
import { Atan2Function } from './numeric/atan2'
import { ATrigoFunction } from './numeric/atrigo'
import { ExpFunction } from './numeric/exp'
import { GreatestLeastFunction } from './numeric/greatest_least'
import { LnFunction } from './numeric/ln'
import { LnWithBaseFunction } from './numeric/ln_with_base'
import { ModFunction } from './numeric/mod'
import { NumberFormatFunction } from './numeric/number_format'
import { PiFunction } from './numeric/pi'
import { PowFunction } from './numeric/pow'
import { RandFunction } from './numeric/rand'
import { RoundFunction } from './numeric/round'
import { SignFunction } from './numeric/sign'
import { SqrtFunction } from './numeric/sqrt'
import { TrigoFunction } from './numeric/trigo'
import { TrigoConvertFunction } from './numeric/trigo_convert'
import { AsciiFunction } from './string/ascii'
import { ConcatFunction } from './string/concat'
import { FieldFunction } from './string/field'
import { FindInSetFunction } from './string/find_in_set'
import { FormatFunction } from './string/format'
import { InsertFunction } from './string/insert'
import { LengthFunction } from './string/length'
import { LetterCaseFunction } from './string/lettercase'
import { LocateFunction } from './string/locate'
import { PadFunction } from './string/pad'
import { RepeatFunction } from './string/repeat'
import { ReplaceFunction } from './string/replace'
import { ReverseFunction } from './string/reverse'
import { SpaceFunction } from './string/space'
import { StrcmpFunction } from './string/strcmp'
import { SubstrFunction } from './string/substr'
import { SubstrIndexFunction } from './string/substr_index'
import { TrimFunction } from './string/trim'

type CreateJQLFunction = () => JQLFunction

/**
 * Supported functions
 */
export const functions: _.Dictionary<CreateJQLFunction> = {
  // numeric functions
  abs: () => new AbsFunction('ABS'),
  acos: () => new ATrigoFunction('ACOS', 'cos'),
  asin: () => new ATrigoFunction('ASIN', 'sin'),
  atan: () => new ATrigoFunction('ATAN', 'tan'),
  atan2: () => new Atan2Function('ATAN2'),
  avg: () => new SumFunction('AVG', true),
  ceil: () => new RoundFunction('CEIL', 'ceil'),
  ceiling: () => new RoundFunction('CEILING', 'ceil'),
  cos: () => new TrigoFunction('COS', 'cos'),
  cot: () => new TrigoFunction('COT', 'cot'),
  count: () => new CountFunction('COUNT'),
  degrees: () => new TrigoConvertFunction('DEGREES', 'radians-degrees'),
  exp: () => new ExpFunction('EXP'),
  floor: () => new RoundFunction('FLOOR', 'floor'),
  greatest: () => new GreatestLeastFunction('GREATEST', 'max'),
  least: () => new GreatestLeastFunction('LEAST', 'min'),
  ln: () => new LnFunction('LN'),
  log: () => new LnFunction('LOG', true),
  log10: () => new LnWithBaseFunction('LOG10', 10),
  log2: () => new LnWithBaseFunction('LOG2', 2),
  max: () => new MinMaxFunction('MAX', 'max'),
  min: () => new MinMaxFunction('MIN', 'min'),
  mod: () => new ModFunction('MOD'),
  number_format: () => new NumberFormatFunction('NUMBER_FORMAT'),
  pi: () => new PiFunction('PI'),
  pow: () => new PowFunction('POW'),
  power: () => new PowFunction('POWER'),
  radians: () => new TrigoConvertFunction('RADIANS', 'degrees-radians'),
  rand: () => new RandFunction('RAND'),
  round: () => new RoundFunction('ROUND', 'normal'),
  sign: () => new SignFunction('sign'),
  sin: () => new TrigoFunction('SIN', 'sin'),
  sqrt: () => new SqrtFunction('SQRT'),
  sum: () => new SumFunction('SUM'),
  tan: () => new TrigoFunction('TAN', 'tan'),
  truncate: () => new RoundFunction('ROUND', 'truncate'),

  // string functions
  ascii: () => new AsciiFunction('ASCII'),
  char_length: () => new LengthFunction('CHAR_LENGTH'),
  character_length: () => new LengthFunction('CHARACTER_LENGTH'),
  concat: () => new ConcatFunction('CONCAT'),
  concat_ws: () => new ConcatFunction('CONCAT_WS', true),
  field: () => new FieldFunction('FIELD'),
  find_in_set: () => new FindInSetFunction('FIND_IN_SET'),
  format: () => new FormatFunction('FORMAT'),
  insert: () => new InsertFunction('INSERT'),
  instr: () => new LocateFunction('INSTR', false),
  lcase: () => new LetterCaseFunction('LCASE', 'lower'),
  left: () => new SubstrFunction('LEFT', 'left'),
  length: () => new LengthFunction('LENGTH'),
  locate: () => new LocateFunction('LOCATE'),
  lower: () => new LetterCaseFunction('LOWER', 'lower'),
  lpad: () => new PadFunction('LPAD', 'left'),
  ltrim: () => new TrimFunction('LTRIM', 'left'),
  mid: () => new SubstrFunction('MID'),
  position: () => new LocateFunction('POSITION'),
  repeat: () => new RepeatFunction('REPEAT'),
  replace: () => new ReplaceFunction('REPLACE'),
  reverse: () => new ReverseFunction('REVERSE'),
  right: () => new SubstrFunction('RIGHT', 'right'),
  rpad: () => new PadFunction('RPAD', 'right'),
  rtrim: () => new TrimFunction('RTRIM', 'right'),
  space: () => new SpaceFunction('SPACE'),
  strcmp: () => new StrcmpFunction('STRCMP'),
  substr: () => new SubstrFunction('SUBSTR'),
  substring: () => new SubstrFunction('SUBSTRING'),
  substring_index: () => new SubstrIndexFunction('SUBSTRING_INDEX'),
  trim: () => new TrimFunction('TRIM', 'both'),
  ucase: () => new LetterCaseFunction('UCASE', 'upper'),
  upper: () => new LetterCaseFunction('UPPER', 'upper'),

  // date functions
  adddate: () => new CalcDateFunction('ADDDATE', 'add'),
  addtime: () => new CalcTimeFunction('ADDTIME', 'add'),
  curdate: () => new CurrentFunction('CURDATE', true),
  current_date: () => new CurrentFunction('CURRENT_DATE', true),
  current_time: () => new CurrentFunction('CURRENT_TIME'),
  current_timestamp: () => new CurrentFunction('CURRENT_TIMESTAMP'),
  curtime: () => new CurrentFunction('CURTIME'),
  date: () => new DateFunction('DATE'),
  datediff: () => new DiffFunction('DATEDIFF', 'day'),
  date_add: () => new CalcDateFunction('DATE_ADD', 'add'),
  date_format: () => new DateFormatFunction('DATE_FORMAT'),
  date_sub: () => new CalcDateFunction('DATE_SUB', 'sub'),
  day: () => new GetFunction('DAY', 'date'),
  dayname: () => new NameFunction('DAYNAME', 'dddd'),
  dayofmonth: () => new GetFunction('DATOFMONTH', 'date'),
  dayofweek: () => new GetFunction('DAYOFWEEK', 'weekday'),
  dayofyear: () => new GetFunction('DAYOFYEAR', 'dayOfYear'),
  extract: () => new ExtractFunction('EXTRACT'),
  from_days: () => new FromDaysFunction('FROM_DAYS'),
  hour: () => new GetFunction('HOUR', 'hour'),
  last_day: () => new LastDayFunction('LAST_DAY'),
  localtime: () => new NowFunction('LOCALTIME'),
  localtimestamp: () => new NowFunction('LOCALTIMESTAMP'),
  makedate: () => new MakeDateFunction('MAKEDATE'),
  maketime: () => new MakeTimeFunction('MAKETIME'),
  minute: () => new GetFunction('MINUTE', 'minute'),
  month: () => new GetFunction('MONTH', 'month'),
  monthname: () => new NameFunction('MONTHNAME', 'MMMM'),
  now: () => new NowFunction('NOW'),
  quarter: () => new GetFunction('QUARTER', 'quarter'),
  subdate: () => new CalcDateFunction('SUBDATE', 'sub'),
  subtime: () => new CalcTimeFunction('SUBTIME', 'sub'),
  timestampdiff: () => new TimestampDiffFunction('TIMESTAMPDIFF'),
  year: () => new GetFunction('YEAR', 'year'),

  // advanced functions
  any_value: () => new AnyValueFunction('ANY_VALUE'),
  bin: () => new BinFunction('BIN'),
  coalesce: () => new CoalesceFunction('COALESCE'),
  conv: () => new ConvFunction('CONV'),
  find: () => new FindFunction('FIND'),
  group_concat: () => new GroupConcatFunction('GROUP_CONCAT'),
  if: () => new IfFunction('IF'),
  ifnull: () => new IfNullFunction('IFNULL'),
  indexof: () => new IndexOfFunction('INDEXOF'),
  isnull: () => new IsNullFunction('ISNULL'),
  nullif: () => new NullIfFunction('NULLIF'),
  number: () => new StringFunction('NUMBER'),
  rows: () => new RowsFunction('ROWS'),
  string: () => new StringFunction('STRING'),
}
