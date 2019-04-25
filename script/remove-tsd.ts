/* tslint:disable:no-console */

import { mapSync, split } from 'event-stream'
import { createReadStream, statSync, unlink } from 'fs'
import minimist = require('minimist')
import * as path from 'path'
import recursive from 'recursive-readdir'

const argv = minimist(process.argv.slice(2))

const tsdfiles = [] as string[]
const checked = {} as { [key: string]: boolean }
function getTsdPaths(filepath) {
  return new Promise((resolve, reject) => {
    if (checked[filepath]) resolve()
    const files_ = [] as string[]
    createReadStream(filepath)
      .pipe(split())
      .pipe(mapSync((line: string) => {
        line = line.trim()
        if (!line.startsWith('export ')) return
        const index = line.indexOf(' from ')
        if (index === -1) return
        const substr = line.substr(index + 6).trim()

        let filepath_ = '', flag = false
        for (let i = 0, length = substr.length; i < length; i += 1) {
          if (substr.charAt(i) === '\'') {
            if (flag) break
            flag = true
          }
          else if (flag) {
            filepath_ += substr.charAt(i)
          }
        }
        let file = path.resolve(path.dirname(filepath), filepath_ + '.d.ts')
        try {
          statSync(file)
          files_.push(file)
        }
        catch (e) {
          file = path.resolve(path.dirname(filepath), filepath_ + '/index.d.ts')
          statSync(file)
          files_.push(file)
        }
      }))
      .on('error', (e) => reject(e))
      .on('end', () => {
        checked[filepath] = true
        Promise.all(files_.map((filepath_) => getTsdPaths(filepath_)))
          .then(() => tsdfiles.push(...files_))
          .then(() => resolve())
          .catch((e) => reject(e))
      })
  })
}

const baseDir = path.resolve(__dirname, '..', 'dist')
const baseFile = path.resolve(baseDir, argv._[0] || 'index.d.ts')
getTsdPaths(baseFile)
  .then(() => {
    recursive(baseDir, ['*.js', baseFile, ...tsdfiles], (err, files) => {
      if (err) throw err
      for (const file of files) {
        unlink(file, (e) => {
          if (e) throw e
          console.log(`${file} deleted`)
        })
      }
    })
  })
