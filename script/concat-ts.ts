import { createReadStream, mkdir, stat, writeFile } from 'fs'
import _ from 'lodash'
import minimist from 'minimist'
import { dirname, resolve } from 'path'
import { createInterface } from 'readline'

function readFile(file: string): Promise<string[]> {
  return new Promise(resolve => {
    const reader = createInterface({
      input: createReadStream(file),
    })
    const lines: string[] = []
    reader.on('line', line => lines.push(line))
    reader.on('close', () => resolve(lines))
  })
}

function getName(word: string): string {
  let result = ''
  for (let i = 0, length = word.length; i < length; i += 1) {
    const char = word.charAt(i)
    if (char === '(' || char === '<') break
    result += char
  }
  return result
}

function existsP(file: string): Promise<boolean> {
  return new Promise(resolve => {
    stat(file, e => resolve(e ? false : true))
  })
}

function mkdirP(file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    mkdir(file, e => e ? reject(e) : resolve())
  })
}

function writeFileP(file: string, data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    writeFile(file, data, e => e ? reject(e) : resolve())
  })
}

class Import {
  public useRequire?: boolean
  public importAs?: string
  public imports: string[] = []

  constructor(public readonly moduleName: string) {
  }

  private get sortedImports(): string[] {
    return this.imports.sort()
  }

  public apply(line: string): void {
    if (line.startsWith('import ')) {
      let importAs: string|undefined
      let imports: string[] = []

      // import ... from '...'
      if (line.indexOf(' from ') > -1) {
        if (line.indexOf('{ ') > -1 && line.indexOf(' }') > -1) {
          const startIndex = line.indexOf('{ ') + 2
          const endIndex = line.indexOf(' }')
          imports = line.substring(startIndex, endIndex).split(', ')
        }
        else {
          importAs = line.substring(7, line.indexOf(' from '))
        }
      }
      // import ... = require('...')
      else if (line.indexOf(' = require(') > -1) {
        this.useRequire = true
        importAs = line.substring(7, line.indexOf(' = '))
      }
      // import '...'
      else if (line.indexOf(`import '`) === 0) {
        // do nothing
      }

      // different names
      if (importAs && this.importAs && importAs !== this.importAs) {
        throw new SyntaxError(`Multiple alias names ${this.importAs} and ${importAs} for '${this.moduleName}'`)
      }

      // multiple formats
      if (this.useRequire && this.imports.length) {
        throw new SyntaxError(`import { ... } from '${this.moduleName}' and import ... = require('${this.moduleName}') are used at the same time`)
      }

      if (importAs) this.importAs = importAs
      if (imports.length) this.imports = Array.from(new Set([...this.imports, ...imports]))
    }
  }

  // @override
  public toString(): string {
    if (!this.importAs && !this.imports.length) {
      return `import '${this.moduleName}'`
    }
    else if (this.importAs && !this.imports.length) {
      return this.useRequire
        ? `import ${this.importAs} = require('${this.moduleName}')`
        : `import ${this.importAs} from '${this.moduleName}'`
    }
    else if (!this.importAs && this.imports.length) {
      return `import { ${this.sortedImports.join(', ')} } from '${this.moduleName}'`
    }
    else /* if (this.importName && this.imports.length) */ {
      return `import ${this.importAs}, { ${this.sortedImports.join(', ')} } from '${this.moduleName}'`
    }
  }
}

(async () => {
  const args = minimist(process.argv.slice(2))
  const indexFile = resolve(__dirname, '..', args._[0])
  if (!indexFile) throw new SyntaxError(`Missing index file`)

  const imports: Import[] = []
  let exports_: string[] = []
  let content: string[] = []
  const check: { [key: string]: boolean } = {}

  async function processFile(file: string): Promise<void> {
    if (!check[file.toLocaleLowerCase()]) {
      check[file.toLocaleLowerCase()] = true
      const dir = dirname(file)
      const lines = await readFile(file)
      for (const line of lines) {
        if (line.startsWith('import') || (line.startsWith('export') && line.indexOf(' from ') > -1)) {
          let index = -1, nextFile = ''
          // export { ... } from '...'
          if (line.startsWith('export') && (index = line.indexOf(' from ')) > -1) {
            nextFile = line.substr(index + 6)
            const startIndex = line.indexOf('{ ') + 2
            const endIndex = line.indexOf(' }')
            if (file === indexFile) exports_.push(...line.substring(startIndex, endIndex).split(', '))
          }
          // import ... from '...'
          else if (line.startsWith('import') && (index = line.indexOf(' from ')) > -1) {
            nextFile = line.substr(index + 6)
          }
          // import ... = require('...')
          else if ((index = line.indexOf(' = require(')) > -1) {
            nextFile = line.substr(index + 11)
            nextFile = nextFile.substr(0, nextFile.length - 1)
          }
          // import '...'
          else if (line.indexOf(`import '`) === 0) {
            nextFile = line.substr(7)
          }
          nextFile = nextFile.substring(1, nextFile.length - 1)
          if (nextFile.startsWith('.')) {
            nextFile = resolve(dir, nextFile)
            nextFile = require.resolve(nextFile)
            await processFile(nextFile)
          }
          else if (line.startsWith('import ')) {
            if (!imports.find(({ moduleName }) => moduleName === nextFile)) {
              imports.push(new Import(nextFile))
            }
            const import_ = imports.find(({ moduleName }) => moduleName === nextFile) as Import
            import_.apply(line)
          }
        }
        else {
          content.push(line)
        }
      }
    }
  }

  await processFile(indexFile)

  exports_ = _.uniq(exports_)
  for (let i = 0, length = content.length; i < length; i += 1) {
    const line = content[i]
    if (line.startsWith('export ')) {
      let name: string|undefined
      const words = line.split(/(\s+)/).filter(w => w !== ' ')
      if (words[1] === 'abstract') words.splice(1, 1)
      if (words[1] === 'class' || words[1] === 'interface' || words[1] === 'type' || words[1] === 'function') {
        name = getName(words[2])
      }
      if (name) {
        const index = exports_.indexOf(name)
        if (index > -1) continue
      }
      content[i] = line.substr(7)
    }
  }

  const outDir = resolve(__dirname, '../intermediate')
  if (!await existsP(outDir)) await mkdirP(outDir)
  imports.sort(({ moduleName: l }, { moduleName: r }) => l.localeCompare(r))
  content = imports.map(i => i.toString()).concat(content)

  if (args['post'] || args['p']) {
    const fn = require(args['post'] || args['p']).default
    content = fn(content)
  }

  await writeFileP(`${outDir}/index.ts`, content.join('\n') + '\n')
})()
