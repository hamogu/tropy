'use strict'

const React = require('react')
const { shallow } = require('enzyme')

describe('Items', () => {
  const { Items } = __require('components/items/items')

  it('has id items', () => {
    expect(shallow(<Items/>)).to.have.id('items')
  })

})