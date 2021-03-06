'use strict'

const { SHELL } = require('../constants')

module.exports = {
  openLink(payload, meta = {}) {
    return { type: SHELL.OPEN_LINK, payload, meta }
  }
}
