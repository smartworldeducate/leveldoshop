import React from 'react'
import { ChevronDown } from 'lucide-react'

/** Short questions and answers that open in place. */
export default function HelpList({ title, items }) {
  return (
    <section className="help-list">
      <h2>{title}</h2>
      <div>
        {items.map(({ q, a }) => (
          <details key={q}>
            <summary>{q} <ChevronDown size={18} /></summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
