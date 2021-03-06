'use strict'

const React = require('react')
const { PureComponent } = React
const PropTypes = require('prop-types')
const { Editable } = require('../editable')
const { IconFolder } = require('../icons')
const { DragSource, DropTarget } = require('react-dnd')
const { NativeTypes } = require('react-dnd-electron-backend')
const { DND } = require('../../constants')
const { bounds } = require('../../dom')
const { isValidImage } = require('../../image')
const cx = require('classnames')
const { noop } = require('../../common/util')


class ListNode extends PureComponent {

  get classes() {
    return {
      'list': true,
      'drop-target': this.props.isSortable,
      'active': this.props.isSelected,
      'dragging': this.props.isDragging,
      'over': this.isOver
    }
  }

  get isOver() {
    return this.props.isOver && this.props.canDrop &&
      this.props.dtType !== DND.LIST
  }

  get isDraggable() {
    return !this.props.isEditing
  }

  handleChange = (name) => {
    const { list: { id, parent }, onSave } = this.props
    onSave(id ? { id, name } : { parent, name })
  }

  handleClick = () => {
    this.props.onClick(this.props.list)
  }

  handleContextMenu = (event) => {
    if (!this.props.isSelected) {
      this.props.onClick(this.props.list)
    }

    this.props.onContextMenu(event, 'list', this.props.list.id)
  }

  setContainer = (container) => {
    this.container = container
  }

  connect(element) {
    if (this.props.isSortable) element = this.props.dt(element)
    if (this.isDraggable) element = this.props.ds(element)

    return element
  }


  render() {
    const { list, isEditing, onEditCancel } = this.props

    return this.connect(
      <li
        className={cx(this.classes)}
        ref={this.setContainer}
        onContextMenu={isEditing ? null : this.handleContextMenu}
        onClick={isEditing ? null : this.handleClick}>
        <IconFolder/>
        <div className="name">
          <Editable
            value={list.name}
            isRequired
            isEditing={isEditing}
            onCancel={onEditCancel}
            onChange={this.handleChange}/>
        </div>
      </li>
    )
  }


  static propTypes = {
    list: PropTypes.shape({
      id: PropTypes.number,
      parent: PropTypes.number,
      name: PropTypes.string
    }),

    isSelected: PropTypes.bool,
    isEditing: PropTypes.bool,
    isSortable: PropTypes.bool,

    isDragging: PropTypes.bool,
    isOver: PropTypes.bool,
    canDrop: PropTypes.bool,

    ds: PropTypes.func.isRequired,
    dt: PropTypes.func.isRequired,
    dtType: PropTypes.string,

    onClick: PropTypes.func.isRequired,
    onEditCancel: PropTypes.func,
    onContextMenu: PropTypes.func,
    onDropItems: PropTypes.func,
    onDropFiles: PropTypes.func,
    onSave: PropTypes.func,
    onSort: PropTypes.func,
    onSortPreview: PropTypes.func,
    onSortReset: PropTypes.func
  }

  static defaultProps = {
    onClick: noop
  }

}

const DragSourceSpec = {
  beginDrag({ list }) {
    return { id: list.id }
  },

  endDrag({ onSort, onSortReset }, monitor) {
    if (monitor.didDrop()) {
      onSort()
    } else {
      onSortReset()
    }
  }
}

const DragSourceCollect = (connect, monitor) => ({
  ds: connect.dragSource(),
  isDragging: monitor.isDragging()
})

const DropTargetSpec = {
  hover({ list, onSortPreview }, monitor, { container }) {
    const type = monitor.getItemType()
    const item = monitor.getItem()

    switch (type) {
      case DND.LIST:
        if (item.id === list.id) break

        var { top, height } = bounds(container)
        var offset = Math.round((monitor.getClientOffset().y - top) / height)

        onSortPreview(item.id, list.id, offset)
        break
    }
  },

  canDrop(_, monitor) {
    const type = monitor.getItemType()
    const item = monitor.getItem()

    switch (type) {
      case NativeTypes.FILE:
        return !!item.files.find(isValidImage)

      default:
        return true
    }
  },

  drop({ list, onDropItems, onDropFiles }, monitor) {
    const type = monitor.getItemType()
    const item = monitor.getItem()

    switch (type) {
      case DND.ITEMS:
        onDropItems({
          list: list.id, items: item.items
        })
        break

      case NativeTypes.FILE:
        onDropFiles({
          list: list.id,
          files: item.files.filter(isValidImage).map(file => file.path)
        })
        break
    }
  }
}

const DropTargetCollect = (connect, monitor) => ({
  dt: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
  dtType: monitor.getItemType()
})


module.exports = {
  ListNode:
    DragSource(
      DND.LIST, DragSourceSpec, DragSourceCollect)(
        DropTarget(
          [DND.LIST, DND.ITEMS, NativeTypes.FILE],
          DropTargetSpec,
          DropTargetCollect)(ListNode))
}
