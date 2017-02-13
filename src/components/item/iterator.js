'use strict'

const React = require('react')
const { PureComponent, PropTypes } = React
const { times } = require('../../common/util')
const { has } = require('../../dom')
const { arrayOf, oneOf, shape, bool, func, number, string } = PropTypes


class ItemIterator extends PureComponent {

  get size() {
    return this.constructor.ZOOM[this.props.zoom]
  }

  isSelected(item) {
    return this.props.selection.includes(item.id)
  }

  getSelection = () => this.props.selection

  handleClickOutside = (event) => {
    if (has(event.target, 'click-catcher')) {
      this.props.onSelect()
    }
  }

  handleContextMenu = (event, item) => {
    const {
      list,
      isDisabled,
      selection,
      onContextMenu
    } = this.props

    const context = ['item']
    const target = { id: item.id, tags: item.tags, list }

    if (selection.length > 1) {
      context.push('bulk')
      target.id = [...selection]

      if (!this.isSelected(item)) {
        target.id.push(item.id)
      }
    }

    if (list) context.push('list')
    if (isDisabled) context.push('deleted')

    onContextMenu(event, context.join('-'), target)
  }

  connect(element) {
    return (this.props.isDisabled) ? element : this.props.dt(element)
  }

  map(fn) {
    return this.props.items.map((item, idx) => fn({
      item,
      cache: this.props.cache,
      size: this.size,
      isLast: idx === this.props.items.length - 1,
      isSelected: this.isSelected(item),
      isDisabled: this.props.isDisabled,
      getSelection: this.getSelection,
      onContextMenu: this.handleContextMenu,
      onDropPhotos: this.props.onPhotoMove,
      onItemOpen: this.props.onItemOpen,
      onSelect: this.props.onSelect
    }))
  }

  static ZOOM = [
    24,
    ...times(57, i => i * 4 + 28),
    ...times(32, i => i * 8 + 256),
    512
  ]

  static get props() {
    return Object.keys(this.propTypes)
  }

  static propTypes = {
    items: arrayOf(shape({
      id: number.isRequired
    })).isRequired,

    sort: shape({
      asc: bool,
      column: string.isRequired,
      type: oneOf(['property']).isRequired
    }).isRequired,

    isOver: bool,
    isDisabled: bool,

    cache: string.isRequired,
    selection: arrayOf(number).isRequired,
    list: number,
    zoom: number.isRequired,

    dt: func.isRequired,
    onContextMenu: func.isRequired,
    onItemOpen: func.isRequired,
    onPhotoMove: func.isRequired,
    onSelect: func.isRequired
  }
}


module.exports = {
  ItemIterator,
  ZOOM: ItemIterator.ZOOM
}
