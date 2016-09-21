'use strict'

const {
  NEW, INSERT, REMOVE, UPDATE
} = require('../constants/list')

const { omit } = require('../common/util')

module.exports = {
  lists(state = {}, { type, payload }) {
    switch (type) {
      case NEW:
      case INSERT:
        return { ...state, [payload.id]: payload }

      case REMOVE:
        return omit(state, [payload])

      case UPDATE:
        return {
          ...state,
          [payload.id]: {
            ...state[payload.id],
            ...payload
          }
        }

      default:
        return state
    }
  }
}