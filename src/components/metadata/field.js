'use strict'

const React = require('react')
const { PureComponent } = React
const { Editable } = require('../editable')
const { FormattedMessage } = require('react-intl')
const { pluck } = require('../../common/util')
const { getLabel } = require('../../common/ontology')
const cx = require('classnames')
const {
  arrayOf, bool, func, number, oneOfType, shape, string
} = require('prop-types')


class MetadataField extends PureComponent {
  get classes() {
    return {
      'metadata-field': true,
      'extra': this.props.isExtra,
      'mixed': this.props.isMixed,
      [this.props.type]: true
    }
  }

  get label() {
    return this.props.property.label || getLabel(this.props.property.id)
  }

  get property() {
    return this.props.property.id
  }

  get details() {
    return pluck(this.props.property, ['id', 'definition', 'comment'])
  }

  handleClick = () => {
    this.props.onEdit(this.props.id, this.property)
  }

  handleChange = (text) => {
    this.props.onChange({
      id: this.props.id,
      data: {
        [this.property]: { text, type: this.props.type }
      }
    })
  }

  handleCancel = (isCommitUnchanged) => {
    if (isCommitUnchanged) {
      return this.handleChange(this.props.text)
    }

    this.props.onEditCancel()
  }

  render() {
    const { classes,  details, label } = this
    const { text, isEditing, isDisabled } = this.props

    return (
      <li className={cx(classes)}>
        <label title={details.join('\n\n')}>{label}</label>
        <div className="value" onClick={this.handleClick}>
          <Editable
            value={text}
            isDisabled={isDisabled}
            isEditing={isEditing}
            onCancel={this.handleCancel}
            onChange={this.handleChange}/>
        </div>
      </li>
    )
  }


  static propTypes = {
    id: oneOfType([number, arrayOf(number)]),

    isEditing: bool,
    isDisabled: bool,
    isExtra: bool,
    isMixed: bool,

    property: shape({
      id: string.isRequired,
      label: string,
      type: string,
      definition: string,
      comment: string
    }),

    text: string,
    type: string.isRequired,

    onEdit: func.isRequired,
    onEditCancel: func.isRequired,
    onChange: func.isRequired
  }

  static defaultProps = {
    type: 'text'
  }
}


const StaticField = ({ type, label, value }) => (
  <li className={cx({ 'metadata-field': true, 'static': true, [type]: true })}>
    <label><FormattedMessage id={label}/></label>
    <div className="value static">{value}</div>
  </li>
)

StaticField.propTypes = {
  label: string.isRequired,
  type: string.isRequired,
  value: oneOfType([string, number]).isRequired
}

module.exports = {
  MetadataField,
  StaticField
}
