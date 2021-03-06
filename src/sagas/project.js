'use strict'

const { OPEN, CLOSE, CLOSED } = require('../constants/project')
const { Database } = require('../common/db')
const { Cache } = require('../common/cache')
const { warn, debug, verbose } = require('../common/log')
const { ipc } = require('./ipc')
const { history } = require('./history')
const { search, load } = require('./search')
const { ontology } = require('./ontology')
const { exec } = require('./cmd')
const mod = require('../models')
const act = require('../actions')
const storage = require('./storage')

const {
  all, fork, cancel, cancelled, call, put, take, takeEvery: every
} = require('redux-saga/effects')


const has = (condition) => (({ error, meta }) =>
  (!error && meta && (!meta.cmd || meta.done) && meta[condition]))

const command = ({ error, meta }) =>
  (!error && meta && meta.cmd === 'project')


function *open(file) {
  try {
    var db = new Database(file, 'w')

    db.on('error', error => {
      warn(`unexpected database error: ${error.message}`)
      debug(error.stack)

      throw error
    })

    const project = yield call(mod.project.load, db)

    var { id } = project
    const cache = new Cache(ARGS.cache, id)

    if (db.path !== ARGS.file) {
      ARGS.file = db.path
      window.location.hash = encodeURIComponent(JSON.stringify(ARGS))
    }

    yield call([cache, cache.init])
    yield put(act.project.opened({ file: db.path, ...project }))

    yield every(has('search'), search, db)
    yield every(has('load'), load)

    yield all([
      call(storage.restore, 'nav', id),
      call(storage.restore, 'columns', id)
    ])

    yield fork(function* () {
      yield all([
        call(mod.project.touch, db, { id }),
        put(act.history.drop()),
        put(act.list.load()),
        put(act.tag.load())
      ])

      yield call(search, db)
      yield call(load, db)
    })

    while (true) {
      const action = yield take(command)
      yield fork(exec, { db, id, cache }, action)
    }


  } catch (error) {
    warn(`unexpected error in open: ${error.message}`)
    debug(error.stack)

  } finally {
    if (id) {
      yield all([
        call(storage.persist, 'nav', id),
        call(storage.persist, 'columns', id)
      ])
    }

    if (db) {
      yield all([
        call(mod.item.prune, db),
        call(mod.list.prune, db),
        call(mod.value.prune, db),
        call(mod.photo.prune, db),
        call(mod.note.prune, db)
      ])

      yield call(db.close)
    }

    yield put(act.project.closed(id))
  }
}


function *main() {
  let task
  let aux

  try {
    aux = yield all([
      fork(ontology),
      fork(ipc),
      fork(history)
    ])

    yield all([
      call(storage.restore, 'ui')
    ])

    while (true) {
      const { type, payload } = yield take([OPEN, CLOSE])

      if (task) {
        yield cancel(task)
        yield take(CLOSED)
      }

      if (type === CLOSE) return

      task = yield fork(open, payload)
    }

  } catch (error) {
    warn(`unexpected error in *main: ${error.message}`)
    debug(error.stack)

  } finally {
    yield all([
      call(storage.persist, 'ui')
    ])

    if (!(yield cancelled())) {
      yield all(aux.map(t => cancel(t)))
    }

    verbose('*main terminated')
  }
}

module.exports = {
  command,
  main,
  open
}
