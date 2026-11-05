import React from 'react'

/** The pale header shared by the coupon and reward pages, in the home hero's style. */
export default function PageHero({ kicker, title, body, actions, points, children }) {
  return (
    <section className={`page-hero${children ? '' : ' page-hero--compact'}`}>
      <div className="page-hero__copy">
        <span className="page-hero__kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{body}</p>
        {actions && <div className="page-hero__actions">{actions}</div>}
        {points && (
          <ul className="page-hero__points">
            {points.map(({ icon: Icon, text }) => <li key={text}><Icon size={16} aria-hidden="true" /> {text}</li>)}
          </ul>
        )}
      </div>
      {children && <div className="page-hero__side">{children}</div>}
    </section>
  )
}
