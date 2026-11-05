import React from 'react'

/** The pale header shared by the coupon and reward pages, in the home hero's style. */
export default function PageHero({ kicker, title, body, actions, children }) {
  return (
    <section className={`page-hero${children ? '' : ' page-hero--compact'}`}>
      <div className="page-hero__copy">
        <span className="page-hero__kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{body}</p>
        {actions && <div className="page-hero__actions">{actions}</div>}
      </div>
      {children && <div className="page-hero__side">{children}</div>}
    </section>
  )
}
