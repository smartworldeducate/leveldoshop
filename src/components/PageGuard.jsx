import React from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import { useSelector } from 'react-redux'

/**
 * Wraps a storefront page that the shopkeeper can switch off in the dashboard.
 * While settings are still loading we render the page — flashing a "closed"
 * notice at every visitor for a moment would be worse than a late hide.
 */
const PageGuard = ({ page, title, children }) => {
  const pages = useSelector((state) => state.settings.values.pages)
  const loaded = useSelector((state) => state.settings.loaded)

  if (!loaded || pages?.[page] !== false) return children

  return (
    <div className="catalog__empty">
      <i className="bx bx-lock-alt"></i>
      <p>
        {title ? `${title} is` : 'This page is'} not available right now.
        <br />
        The rest of the shop is open as usual.
      </p>
      <Link href="/catalog" className="catalog__filter__clear">
        Shop groceries
      </Link>
    </div>
  )
}

PageGuard.propTypes = {
  page: PropTypes.string.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
}

export default PageGuard
