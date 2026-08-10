import React from 'react'
import PropTypes from 'prop-types'

/**
 * Filter checkbox. The whole row is the hit target, and an optional `count`
 * sits on the right so the shopper sees how much is behind each option before
 * they tick it.
 */
const CheckBox = ({ label, count, checked = false, disabled = false, onChange }) => {
  const handle = (e) => onChange?.({ checked: e.target.checked, value: label })

  return (
    <label className={`custom-checkbox ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={handle} />
      <span className="custom-checkbox__box">
        <i className="bx bx-check"></i>
      </span>
      <span className="custom-checkbox__label">{label}</span>
      {count != null && <span className="custom-checkbox__count">{count}</span>}
    </label>
  )
}

CheckBox.propTypes = {
  label: PropTypes.string.isRequired,
  count: PropTypes.number,
  checked: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
}

export default CheckBox
