'use strict'

const assert = require('assert')
const { ipcRenderer: ipc } = require('electron')
const { counter, get } = require('./common/util')
const { warn } = require('./common/log')

let seq
let pending
let STORE

function t(id) {
  return get(STORE.getState(), ['intl', 'messages', `error.${id}`], id)
}

function start(store) {
  assert(seq == null, 'already initialized')

  seq = counter()
  pending = {}
  STORE = store

  ipc.on('dialog', onClosed)
}

function stop() {
  ipc.removeListener('dialog', onClosed)
  seq = null
  pending = null
}

function onClosed(_, { id, payload, error }) {
  try {
    pending[id][error ? 'reject' : 'resolve'](payload)

  } catch (error) {
    warn(`failed to resolve dialog #${id}: ${error.message}`)

  } finally {
    delete pending[id]
  }
}

function open(type, options = {}) {
  return new Promise((resolve, reject) => {
    const id = seq.next().value

    ipc.send('dialog', { id, type, options })
    pending[id] = { resolve, reject }
  })
}

function notify(options) {
  return open('message-box', {
    type: 'none', buttons: ['OK'], ...options
  })
}

function fail(error, message = 'Error') {
  return notify({
    type: 'error',
    title: 'Error',
    message: t(message),
    detail: (message === error.message) ? null : error.message
  })
}

async function prompt(message) {
  const response = await open('message-box', {
    type: 'question',
    buttons: ['Cancel', 'Yes'],
    message,
    defaultId: 0,
    cancelId: 0
  })

  return response !== 0
}

function save(options) {
  return open('save', options)
}

function file(options) {
  return open('file', options)
}

function openImages(options) {
  return open('file', {
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg'] }
    ],
    properties: ['openFile', 'multiSelections'],
    ...options
  })
}

function openVocabs(options) {
  return open('file', {
    filters: [
      { name: 'Vocabularies', extensions: ['n3'] }
    ],
    properties: ['openFile', 'multiSelections'],
    ...options
  })
}

function saveProject(options) {
  return open('save', {
    filters: [
      { name: 'Tropy Projects', extensions: ['tpy'] }
    ],
    ...options
  })
}

module.exports = {
  start,
  stop,
  open,
  notify,
  fail,
  file,
  openImages,
  openVocabs,
  save,
  saveProject,
  prompt
}
