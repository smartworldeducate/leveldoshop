import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector } from 'react-redux'

import { visibleCategories } from '../data/grocery'

/**
 * Sticky aisle strip under the header — the primary way people navigate a
 * grocery store. Aisles come from the dashboard, in the order set there, and
 * only the ones switched on are shown.
 */
export default function AisleBar() {
  const router = useRouter()
  const categories = useSelector((state) => state.categories.items)
  const active = router.query.category

  const aisles = visibleCategories(categories)
  if (!aisles.length) return null

  return (
    <div className="aisle-bar">
      <div className="container aisle-bar__inner">
        <Link
          href="/catalog"
          className={`aisle-bar__chip ${router.pathname === '/catalog' && !active ? 'is-active' : ''}`}
        >
          All aisles
        </Link>

        {aisles.map((c) => (
          <Link
            key={c.slug}
            href={`/catalog?category=${c.slug}`}
            className={`aisle-bar__chip ${active === c.slug ? 'is-active' : ''}`}
          >
            <span className="aisle-bar__dot" style={{ backgroundColor: c.accent }} />
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
