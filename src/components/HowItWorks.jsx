import React from 'react'
import { useSelector } from 'react-redux'

import { DEFAULT_HOME } from '../data/home'

/**
 * The steps between "I need milk" and milk in the fridge. Grocery shoppers are
 * buying a promise about time, so spelling the timeline out does more work than
 * another row of products. The steps themselves are written in the dashboard.
 */
export default function HowItWorks() {
  const { contact, home } = useSelector((state) => state.settings.values)
  const cutoff = contact?.orderCutoff || '4pm'

  const steps = (home?.steps?.length ? home.steps : DEFAULT_HOME.steps).filter((s) =>
    (s.title || '').trim()
  )

  if (!steps.length) return null

  return (
    <div className="steps">
      {steps.map((step, i) => (
        <div className="steps__item" key={step.id || step.title}>
          <span className="steps__num">{i + 1}</span>
          <span className="steps__icon">
            <i className={step.icon || 'bx bx-basket'}></i>
          </span>
          <h3 className="steps__title">{step.title}</h3>
          {/* `{cutoff}` keeps the delivery step honest when the cut-off moves */}
          <p className="steps__body">{String(step.body || '').replace(/\{cutoff\}/g, cutoff)}</p>
        </div>
      ))}
    </div>
  )
}
