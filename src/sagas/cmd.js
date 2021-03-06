'use strict'

const { exec } = require('../commands')
const { fail } = require('../dialog')
const { warn, verbose } = require('../common/log')
const { put } = require('redux-saga/effects')
const { activity, history } = require('../actions')

const TOO_LONG = ARGS.dev ? 500 : 1500

module.exports = {
  *exec(options, action) {
    try {
      const cmd = yield exec(action, options)
      const { type, meta } = action

      yield put(activity.done(action, cmd.error || cmd.result))

      if (meta.history && cmd.isomorph) {
        yield put(history.tick(cmd.history(), meta.history))
      }

      if (cmd.error) fail(cmd.error, type)
      if (cmd.duration > TOO_LONG) warn(`SLOW: ${type}`)

    } catch (error) {
      warn(`${action.type} unexpectedly failed in *exec: ${error.message}`)
      verbose(error.stack)
    }
  }
}
