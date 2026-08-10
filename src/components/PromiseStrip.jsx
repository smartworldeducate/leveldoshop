import React from 'react'
import Link from 'next/link'
import { useSelector } from 'react-redux'

import { DEFAULT_HOME } from '../data/home'

/**
 * Compact promise band. The four promises, their icons and where they lead are
 * all set in the dashboard; a promise with no title is treated as an empty row
 * and skipped rather than rendered blank.
 */
export default function PromiseStrip() {
  const home = useSelector((state) => state.settings.values.home)
  const items = (home?.promises?.length ? home.promises : DEFAULT_HOME.promises).filter(
    (item) => (item.title || '').trim()
  )

  if (!items.length) return null

  return (
    <div className="promise-strip">
      {items.map((item, i) => {
        const body = (
          <>
            <i className={item.icon || 'bx bx-check-shield'}></i>
            <span>
              <strong>{item.title}</strong>
              {item.note && <small>{item.note}</small>}
            </span>
          </>
        )

        // A promise without a destination is a statement, not a link — and a
        // link to nowhere is worse than plain text.
        return item.href ? (
          <Link key={item.id || i} href={item.href} className="promise-strip__item">
            {body}
          </Link>
        ) : (
          <div key={item.id || i} className="promise-strip__item">
            {body}
          </div>
        )
      })}
    </div>
  )
}
