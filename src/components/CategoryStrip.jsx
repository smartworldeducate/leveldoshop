import React from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import { useSelector } from 'react-redux'

import { aisleIcon, formatMoney, isSellable, visibleCategories } from '../data/grocery'

/**
 * Collection cards. Aisles are whatever the dashboard says they are; each one
 * borrows the photograph of a product it holds and shows the real entry price,
 * so the card is a price promise rather than decoration. Empty aisles keep
 * their door open with the accent colour instead of a photo.
 */
const CategoryStrip = ({ products = [] }) => {
  const categories = useSelector((state) => state.categories.items)
  const aisles = visibleCategories(categories)

  // One pass: cheapest sellable price and a usable photo per aisle.
  const byAisle = products.reduce((acc, p) => {
    const slug = p.categorySlug
    if (!slug) return acc
    const row = acc[slug] || (acc[slug] = { count: 0, from: null, image: null })
    row.count += 1
    if (!row.image && p.images?.[0]) row.image = p.images[0]
    if (isSellable(p)) {
      const price = Number(p.price)
      if (Number.isFinite(price) && (row.from === null || price < row.from)) row.from = price
    }
    return acc
  }, {})

  if (!aisles.length) return null

  return (
    <div className="collection-grid">
      {aisles.map((c) => {
        const row = byAisle[c.slug] || { count: 0, from: null, image: null }

        return (
          <Link
            key={c.slug}
            href={`/catalog?category=${c.slug}`}
            className={`collection-card ${row.image ? '' : 'no-photo'} ${
              row.count ? '' : 'is-empty'
            }`}
            style={{ '--aisle-accent': c.accent }}
          >
            <span className="collection-card__media">
              {row.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.image} alt="" />
              ) : (
                <span className="collection-card__glyph" aria-hidden="true">
                  <i className={aisleIcon(c.slug)}></i>
                </span>
              )}

              {row.count > 0 && (
                <span className="collection-card__count">
                  {row.count} item{row.count === 1 ? '' : 's'}
                </span>
              )}

              <span className="collection-card__go" aria-hidden="true">
                <i className="bx bx-right-arrow-alt"></i>
              </span>
            </span>

            <span className="collection-card__name">{c.name}</span>
            <span className="collection-card__from">
              {row.from !== null
                ? `From ${formatMoney(row.from)}`
                : row.count
                ? 'Back in stock soon'
                : 'Coming soon'}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

CategoryStrip.propTypes = {
  products: PropTypes.array,
}

export default CategoryStrip
