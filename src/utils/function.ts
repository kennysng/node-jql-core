export class JQLFunction {
  /**
   * Generate Function instance from code string
   * @param code [string]
   */
  constructor(code: string) {
    code = code.trim()

    if (!code.startsWith('function')) throw new SyntaxError(`Position 0: Keyword 'function' is missing`)

    const argsIndex = [code.indexOf('(') + 1, code.indexOf(')')]
    const bodyIndex = [code.indexOf('{') + 1, code.lastIndexOf('}')]
    if (argsIndex[1] > bodyIndex[0]) throw new SyntaxError(`Position ${bodyIndex[0]}: Curved bracket '{}' is not allowed in argument section 'function()'`)
    if (bodyIndex[1] - bodyIndex[0] === 1) throw new SyntaxError(`Position ${bodyIndex[0]}: Empty function`)

    let args: string[] = []
    if (argsIndex[1] - argsIndex[0] > 1) {
      args = code.substring(argsIndex[0], argsIndex[1]).split(',').map(pc => pc.trim())
    }
    args.push(code.substring(bodyIndex[0], bodyIndex[1]))

    return new Function(...args)
  }
}
