import React from 'react'
import PropTypes from 'prop-types'

const Grid = ({ col, mdCol = 1, smCol = 1, gap = 0, children }) => {
  // Exposed as a custom property so `.grid` can tighten it on smaller screens
  // (an inline `gap` would win over every media query).
  const style = { '--grid-gap': `${gap}px` }

  const colClass = `grid-col-${col}`
  const mdColClass = `grid-col-md-${mdCol}`
  const smColClass = `grid-col-sm-${smCol}`

  return (
    <div
      className={`grid grid-gapped ${colClass} ${mdColClass} ${smColClass}`}
      style={style}
    >
      {children}
    </div>
  )
}

Grid.propTypes = {
  col: PropTypes.number.isRequired,
  mdCol: PropTypes.number,
  smCol: PropTypes.number,
  gap: PropTypes.number,
  children: PropTypes.node
}

export default Grid
