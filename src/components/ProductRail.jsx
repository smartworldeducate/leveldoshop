import React, { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'

import ProductCard from './ProductCard'

/**
 * Horizontal scroller for promo rows. A rail beats a grid here: it shows the
 * row is a curated selection, and it costs one screen height instead of three.
 * The arrows page by a viewport-width at a time and disable at either end, so
 * the row never looks scrollable when it isn't.
 */
const ProductRail = ({ items }) => {
  const track = useRef(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  const measure = useCallback(() => {
    const el = track.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4 })
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, items])

  const page = (dir) => {
    const el = track.current
    if (!el) return
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.9), behavior: 'smooth' })
  }

  if (!items?.length) return null

  const scrollable = !(edges.start && edges.end)

  return (
    <div className="p-rail-wrap">
      {scrollable && (
        <div className="p-rail__nav">
          <button
            type="button"
            onClick={() => page(-1)}
            disabled={edges.start}
            aria-label="Scroll left"
          >
            <i className="bx bx-chevron-left"></i>
          </button>
          <button
            type="button"
            onClick={() => page(1)}
            disabled={edges.end}
            aria-label="Scroll right"
          >
            <i className="bx bx-chevron-right"></i>
          </button>
        </div>
      )}

      <div className="p-rail" ref={track} onScroll={measure}>
        {items.map((item) => (
          <div className="p-rail__item" key={item.id || item.slug}>
            <ProductCard product={item} />
          </div>
        ))}
      </div>
    </div>
  )
}

ProductRail.propTypes = {
  items: PropTypes.array,
}

export default ProductRail
