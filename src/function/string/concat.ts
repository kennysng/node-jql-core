import { JQLFunction } from '..'

export class ConcatFunction extends JQLFunction<string> {
  public readonly type = 'string'

  public run(...args: any[]): string {
    return args.map(arg => String(arg)).join('')
  }
}
