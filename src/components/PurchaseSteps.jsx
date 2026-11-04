import React from 'react'
import { Check } from 'lucide-react'

const STEPS = ['Details sent', 'Checking payment', 'Code ready']
const REACHED = { pending: 1, confirmed: 2 }

/** Where a customer's purchase has got to. Rejected and cancelled ones have no next step. */
export default function PurchaseSteps({ status = 'pending' }) {
  const reached = REACHED[status]
  if (reached === undefined) return null

  const done = (i) => i < reached || status === 'confirmed'

  return (
    <ol className="buy-steps">
      {STEPS.map((step, i) => (
        <li key={step} className={done(i) ? 'is-done' : ''} aria-current={!done(i) && i === reached ? 'step' : undefined}>
          <span>{done(i) ? <Check size={14} /> : i + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  )
}
