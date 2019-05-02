import { JQLFunction } from '.'
import { AlreadyExistsError } from '../utils/error/AlreadyExistsError'
import { NotFoundError } from '../utils/error/NotFoundError'
import { CalcDateFunction } from './date/calcdate'
import { CalcTimeFunction } from './date/calctime'
import { CurrentFunction } from './date/current'
import { DateFunction } from './date/date'
import { DateFormatFunction } from './date/date_format'
import { DayFunction } from './date/day'
import { DayNameFunction } from './date/dayname'
import { DiffFunction } from './date/diff'
import { AbsFunction } from './numeric/abs'
import { CountFunction } from './numeric/aggregate/count'
import { MinMaxFunction as MinMaxAggregateFunction } from './numeric/aggregate/minmax'
import { SumFunction } from './numeric/aggregate/sum'
import { Atan2Function } from './numeric/atan2'
import { ATrigoFunction } from './numeric/atrigo'
import { ExpFunction } from './numeric/exp'
import { LnFunction } from './numeric/ln'
import { LnWithBaseFunction } from './numeric/ln_with_base'
import { MinMaxFunction } from './numeric/minmax'
import { ModFunction } from './numeric/mod'
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

export class Functions {
  private readonly functions: { [key: string]: () => JQLFunction } = {}
  private readonly timestamp: { [key: string]: number } = {}

  constructor(private readonly parent?: Functions) {
    if (!parent) {
      // numeric functions
      this.register('abs', () => new AbsFunction('ABS'))
      this.register('acos', () => new ATrigoFunction('ACOS', 'cos'))
      this.register('asin', () => new ATrigoFunction('ASIN', 'sin'))
      this.register('atan', () => new ATrigoFunction('ATAN', 'tan'))
      this.register('atan2', () => new Atan2Function('ATAN2'))
      this.register('avg', () => new SumFunction('AVG', true))
      this.register('ceil', () => new RoundFunction('CEIL', 'ceil'))
      this.register('ceiling', () => new RoundFunction('CEILING', 'ceil'))
      this.register('cos', () => new TrigoFunction('COS', 'cos'))
      this.register('cot', () => new TrigoFunction('COT', 'cot'))
      this.register('count', () => new CountFunction('COUNT'))
      this.register('degrees', () => new TrigoConvertFunction('DEGREES', 'radians-degrees'))
      this.register('exp', () => new ExpFunction('EXP'))
      this.register('floor', () => new RoundFunction('FLOOR', 'floor'))
      this.register('greatest', () => new MinMaxFunction('GREATEST', 'max'))
      this.register('lease', () => new MinMaxFunction('LEAST', 'min'))
      this.register('ln', () => new LnFunction('LN'))
      this.register('log', () => new LnFunction('LOG', true))
      this.register('log10', () => new LnWithBaseFunction('LOG10', 10))
      this.register('log2', () => new LnWithBaseFunction('LOG10', 2))
      this.register('max', () => new MinMaxAggregateFunction('MAX', 'max'))
      this.register('min', () => new MinMaxAggregateFunction('MIN', 'min'))
      this.register('mod', () => new ModFunction('MOD'))
      this.register('pi', () => new PiFunction('PI'))
      this.register('pow', () => new PowFunction('POW'))
      this.register('power', () => new PowFunction('POWER'))
      this.register('radians', () => new TrigoConvertFunction('RADIANS', 'degrees-radians'))
      this.register('rand', () => new RandFunction('RAND'))
      this.register('round', () => new RoundFunction('ROUND', 'normal'))
      this.register('sign', () => new SignFunction('SIGN'))
      this.register('sin', () => new TrigoFunction('SIN', 'sin'))
      this.register('sqrt', () => new SqrtFunction('SQRT'))
      this.register('sum', () => new SumFunction('SUM'))
      this.register('tan', () => new TrigoFunction('TAN', 'tan'))
      this.register('truncate', () => new RoundFunction('ROUND', 'truncate'))

      // string functions
      this.register('ascii', () => new AsciiFunction('ASCII'))
      this.register('char_length', () => new LengthFunction('CHAR_LENGTH'))
      this.register('character_length', () => new LengthFunction('CHARACTER_LENGTH'))
      this.register('concat', () => new ConcatFunction('CONCAT'))
      this.register('concat_ws', () => new ConcatFunction('CONCAT_WS', true))
      this.register('field', () => new FieldFunction('FIELD'))
      this.register('find_in_set', () => new FindInSetFunction('FIND_IN_SET'))
      this.register('format', () => new FormatFunction('FORMAT'))
      this.register('insert', () => new InsertFunction('INSERT'))
      this.register('instr', () => new LocateFunction('INSTR', false))
      this.register('lcase', () => new LetterCaseFunction('LCASE', 'lower'))
      this.register('left', () => new SubstrFunction('LEFT', 'left'))
      this.register('length', () => new LengthFunction('LENGTH'))
      this.register('locate', () => new LocateFunction('LOCATE'))
      this.register('lower', () => new LetterCaseFunction('LOWER', 'lower'))
      this.register('lpad', () => new PadFunction('LPAD', 'left'))
      this.register('ltrim', () => new TrimFunction('LTRIM', 'left'))
      this.register('mid', () => new SubstrFunction('MID'))
      this.register('position', () => new LocateFunction('POSITION'))
      this.register('repeat', () => new RepeatFunction('REPEAT'))
      this.register('replace', () => new ReplaceFunction('REPLACE'))
      this.register('reverse', () => new ReverseFunction('REVERSE'))
      this.register('right', () => new SubstrFunction('RIGHT', 'right'))
      this.register('rpad', () => new PadFunction('RPAD', 'right'))
      this.register('rtrim', () => new TrimFunction('RTRIM', 'right'))
      this.register('space', () => new SpaceFunction('SPACE'))
      this.register('strcmp', () => new StrcmpFunction('STRCMP'))
      this.register('substr', () => new SubstrFunction('SUBSTR'))
      this.register('substring', () => new SubstrFunction('SUBSTRING'))
      this.register('substring_index', () => new SubstrIndexFunction('SUBSTRING_INDEX'))
      this.register('trim', () => new TrimFunction('TRIM', 'both'))
      this.register('ucase', () => new LetterCaseFunction('UCASE', 'upper'))
      this.register('upper', () => new LetterCaseFunction('UPPER', 'upper'))

      // date functions
      this.register('adddate', () => new CalcDateFunction('ADDDATE', 'add'))
      this.register('addtime', () => new CalcTimeFunction('ADDTIME', 'add'))
      this.register('curdate', () => new CurrentFunction('CURDATE', true))
      this.register('current_date', () => new CurrentFunction('CURRENT_DATE', true))
      this.register('current_time', () => new CurrentFunction('CURRENT_TIME'))
      this.register('current_timestamp', () => new CurrentFunction('CURRENT_TIMESTAMP'))
      this.register('curtime', () => new CurrentFunction('CURTIME'))
      this.register('date', () => new DateFunction('DATE'))
      this.register('datediff', () => new DiffFunction('DATEDIFF', 'day'))
      this.register('date_add', () => new CalcDateFunction('DATE_ADD', 'add'))
      this.register('date_format', () => new DateFormatFunction('DATE_FORMAT'))
      this.register('date_sub', () => new CalcDateFunction('DATE_SUB', 'sub'))
      this.register('day', () => new DayFunction('DAY', 'month'))
      this.register('dayname', () => new DayNameFunction('DAYNAME'))
      this.register('dayofmonth', () => new DayFunction('DAYOFMONTH', 'month'))
      this.register('dayofweek', () => new DayFunction('DAYOFWEEK', 'week'))
      this.register('dayofyear', () => new DayFunction('DAYOFYEAR', 'year'))
      this.register('subdate', () => new CalcDateFunction('SUBDATE', 'sub'))
      this.register('subtime', () => new CalcTimeFunction('SUBTIME', 'sub'))
    }
  }

  public register(name: string, jqlFunction: () => JQLFunction, ifNotExists?: true): void {
    const name_ = name.toLocaleLowerCase()
    if (this.functions[name_] && ifNotExists) throw new AlreadyExistsError(`Function '${name}' already exists`)
    this.functions[name_] = jqlFunction
    this.timestamp[name_] = Date.now()
  }

  public get(name: string): JQLFunction {
    if (this.parent) {
      const lastModified = [this.getLastModified(name), this.parent.getLastModified(name)]
      if (lastModified[0] === lastModified[1] && lastModified[1] === 0) throw new NotFoundError(`Function '${name}' not found`)
      return lastModified[0] >= lastModified[1] ? this.get_(name) : this.parent.get(name)
    }
    return this.get_(name)
  }

  private get_(name: string): JQLFunction {
    const fn = this.functions[name.toLocaleLowerCase()]
    if (!fn) throw new NotFoundError(`Function '${name}' not found`)
    return fn()
  }

  private getLastModified(name: string): number {
    return this.timestamp[name.toLocaleLowerCase()] || 0
  }
}
