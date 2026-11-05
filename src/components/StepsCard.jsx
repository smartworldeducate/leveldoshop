import React from 'react'

/** A short numbered "how it works" list for the side of a page. */
export default function StepsCard({ title, steps, children }) {
  return (
    <aside className="steps-card">
      <h2>{title}</h2>
      <ol>
        {steps.map(({ title: step, note }) => (
          <li key={step}>
            <strong>{step}</strong>
            <small>{note}</small>
          </li>
        ))}
      </ol>
      {children}
    </aside>
  )
}
