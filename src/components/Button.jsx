import React from 'react'
import PropTypes from 'prop-types'

// `size` doubles as a modifier at existing call sites: "sm" | "lg" | "block".
const Button = (props) => {
  const bg = props.backgroundColor ? 'bg-' + props.backgroundColor : 'bg-main'
  const size = props.size ? 'btn-' + props.size : ''

  return (
    <button
      type={props.type || 'button'}
      disabled={props.disabled}
      className={`btn ${bg} ${size}`.trim()}
      onClick={props.onClick ? () => props.onClick() : null}
    >
      {props.icon && (
        <span className="btn__icon">
          <i className={props.icon}></i>
        </span>
      )}
      <span className="btn__txt">{props.children}</span>
    </button>
  )
}

Button.propTypes = {
  backgroundColor: PropTypes.string,
  size: PropTypes.string,
  icon: PropTypes.string,
  type: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node
}

export default Button
