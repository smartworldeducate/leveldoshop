import React from 'react'
import Link from 'next/link'

/**
 * Left-aligned section heading: a small uppercase kicker, an editorial title
 * and an optional "see all" link on the right — so every shelf tells the
 * shopper both what it is and where the rest of it lives.
 */
export default function SectionHead({ title, kicker, note, href, linkLabel = 'See all' }) {
  return (
    <div className="section-head">
      <div>
        {kicker && <span className="section-head__kicker">{kicker}</span>}
        <h2 className="section-head__title">{title}</h2>
        {note && <p className="section-head__note">{note}</p>}
      </div>

      {href && (
        <Link href={href} className="section-head__link">
          {linkLabel}
          <i className="bx bx-right-arrow-alt"></i>
        </Link>
      )}
    </div>
  )
}
