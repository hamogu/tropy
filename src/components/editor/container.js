'use strict'

const React = require('react')
const { PureComponent, PropTypes } = React
const { func, bool, object, number } = PropTypes
const { EditorToolbar } = require('./toolbar')
const { EditorState } = require('prosemirror-state')
const { EditorView } = require('./view')
const { schema } = require('./schema')
const commands = require('./commands')(schema)
const plugins = require('./plugins')(schema)
const { match } = require('../../keymap')
const cx = require('classnames')
const { pick, noop } = require('../../common/util')


class Editor extends PureComponent {
  constructor(props) {
    super(props)
    this.state = {}
  }

  setContainer = (container) => {
    this.container = container
  }

  setView = (view) => {
    this.view = view.pm
  }

  get classes() {
    return {
      'editor': true,
      'is-blurred': !this.state.hasViewFocus
    }
  }

  get text() {
    return this.view.dom.innerText.replace(/\s\s+/g, ' ')
  }

  get html() {
    return this.view.dom.innerHtml
  }

  getEditorState({ content } = this.props) {
    if (content == null) {
      return EditorState.create({ schema, plugins })
    }

    if (content instanceof EditorState) {
      return content
    }

    return EditorState.fromJSON({ schema, plugins }, content)
  }

  focus = () => {
    this.view.focus()
  }

  exec(command) {
    return (commands[command] || noop)(
      this.view.state, this.view.dispatch, this.view
    )
  }

  handleChange = (tr) => {
    this.props.onChange(this.view.state.apply(tr), tr.docChanged)
  }

  handleKeyDown = (_, event) => {
    return this.exec(match(this.props.keymap, event))
  }

  handleFocus = (event) => {
    if (event.target === this.container) {
      setTimeout(this.focus, 0)
    }
  }

  handleCommand = (command) => {
    if (this.exec(command)) {
      if (!this.state.hasViewFocus) this.focus()
    }
  }

  handleViewFocus = () => {
    this.setState({ hasViewFocus: true })
  }

  handleViewBlur = () => {
    this.setState({ hasViewFocus: false })
  }

  render() {
    const { isDisabled, tabIndex } = this.props
    const state = this.getEditorState()

    return (
      <div
        ref={this.setContainer}
        className={cx(this.classes)}
        tabIndex={-1}
        onFocus={this.handleFocus}>
        {!isDisabled &&
          <EditorToolbar
            state={state}
            onCommand={this.handleCommand}/>
        }

        <div className="scroll-container">
          <EditorView
            ref={this.setView}
            state={state}
            isDisabled={isDisabled}
            tabIndex={tabIndex}
            onFocus={this.handleViewFocus}
            onBlur={this.handleViewBlur}
            onChange={this.handleChange}
            onKeyDown={this.handleKeyDown}/>
        </div>
      </div>
    )
  }

  static propTypes = {
    content: object,
    isDisabled: bool,
    keymap: object.isRequired,
    onChange: func.isRequired,
    tabIndex: number.isRequired
  }

  static defaultProps = {
    tabIndex: -1
  }
}

module.exports = {
  Editor
}