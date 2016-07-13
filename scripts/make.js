'use strict'

require('shelljs/make')

const assert = require('assert')
const babel = require('babel-core')
const glob = require('glob')
const sass = require('node-sass')
const log = require('./log')

const { statSync: stat } = require('fs')
const { join, resolve, relative, dirname } = require('path')

const home = resolve(__dirname, '..')
const nbin = join(home, 'node_modules', '.bin')
const doc = join(home, 'doc')
const cov = join(home, 'coverage')
const scov = join(home, 'src-cov')

const emocha = join(nbin, 'electron-mocha')
const lint = join(nbin, 'eslint')
const istanbul = join(nbin, 'istanbul')

Object.assign(target, require('./electron'))

config.fatal = false
config.silent = false

target.lint = (bail) => {
  const { code } = exec(`${lint} --color src test static scripts`)
  if (bail && code) process.exit(code)
}


target.test = (...args) => {
  target['lint']()

  // Disk I/O can be very slow on AppVeyor!
  if (process.env.APPVEYOR) args.push('-C -t 8000 -s 2000')

  target['test:browser'](...args)
  target['test:renderer'](...args)
}

target['test:renderer'] = (...args) => {
  target.unlink()

  args.unshift('--renderer')

  mocha(args.concat(
    glob.sync('test/**/*_test.js', { ignore: 'test/browser/*' })))
}

target['test:browser'] = (...args) => {
  target.unlink()

  mocha(args.concat(
    glob.sync('test/{browser,common}/**/*_test.js')))
}

target.mocha = (args, silent, cb) => mocha(args, silent, cb)


target.compile = () => {
  target['compile:js']()
  target['compile:css']()
}

target['compile:js'] = (pattern) => {
  const tag = 'compile:js'

  new glob
    .Glob(pattern || 'src/**/*.{js,jsx}')
    .on('error', (err) => log.error(err, { tag }))

    .on('match', (file) => {
      let src = relative(home, file)
      let dst = swap(src, 'src', 'lib', '.js')

      assert(src.startsWith('src'))
      if (fresh(src, dst)) return

      log.info(dst, { tag })

      babel.transformFile(src, (err, result) => {
        if (err) return log.error(err, { tag })

        mkdir('-p', dirname(dst))
        result.code.to(dst)
      })
    })
}

target['compile:css'] = (pattern) => {
  const tag = 'compile:css'

  new glob
    .Glob(pattern || 'src/stylesheets/**/!(_*).{sass,scss}')
    .on('error', (err) => log.error(err, { tag }))

    .on('match', (file) => {
      let src = relative(home, file)
      let dst = swap(src, 'src', 'lib', '.css')

      assert(src.startsWith(join('src', 'stylesheets')))
      log.info(dst, { tag })

      let options = {
        file: src,
        functions: SassExtensions,
        outFile: dst,
        outputStyle: 'compressed',
        sourceMap: true
      }

      sass.render(options, (err, result) => {
        if (err) return log.error(`${err.line}: ${err.message}`, { tag })

        mkdir('-p', dirname(dst))
        String(result.css).to(dst)
        String(result.map).to(`${dst}.map`)
      })
    })
}


target.cover = (args) => {
  const tag = 'cover'
  args = args || ['html', 'lcov']

  rm('-rf', cov)
  rm('-rf', scov)

  process.env.COVERAGE = true

  target['test:browser'](['--require test/support/coverage'])
  mv(`${cov}/coverage-final.json`, `${cov}/coverage-browser.json`)

  target['test:renderer'](['--require test/support/coverage'])
  mv(`${cov}/coverage-final.json`, `${cov}/coverage-renderer.json`)

  log.info('writing coverage report...', { tag })
  exec(`${istanbul} report --root ${cov} ${args.join(' ')}`, { silent: true })

  rm('-rf', scov)
}


target.rules = () => {
  for (let rule in target) log.info(rule, { tag: 'make' })
}


target.clean = () => {
  target.unlink()

  rm('-rf', join(home, 'lib'))
  rm('-rf', join(home, 'dist'))
  rm('-rf', doc)
  rm('-rf', cov)
  rm('-rf', scov)

  rm('-f', join(home, 'npm-debug.log'))
}


function fresh(src, dst) {
  try {
    return stat(dst).mtime > stat(src).mtime

  } catch (_) {
    return false
  }
}

function swap(filename, src, dst, ext) {
  return filename
    .replace(src, dst)
    .replace(/(\..+)$/, m => ext || m[1])
}

function mocha(options, silent, cb) {
  return exec(`${emocha} ${options.join(' ')}`, { silent }, cb)
}

const SassExtensions = {
}

// We need to make a copy when exposing targets to other scripts,
// because any method on target can be called just once per execution!
module.exports = Object.assign({}, target)
