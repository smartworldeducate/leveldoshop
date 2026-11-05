import React from 'react'
import { useSelector } from 'react-redux'

import { whatsappNumber } from '../data/notifications'

/** "Contact us" opens WhatsApp with the shop, or calls it. With neither set, it's plain words. */
export default function ContactLink({ className, children = 'Contact us', message = '' }) {
  const { whatsapp, phone } = useSelector((state) => state.settings.values.contact) || {}
  const number = whatsappNumber(whatsapp)

  if (number) {
    const text = message ? `?text=${encodeURIComponent(message)}` : ''
    return <a href={`https://wa.me/${number}${text}`} target="_blank" rel="noreferrer" className={className}>{children}</a>
  }
  if (phone) return <a href={`tel:${phone}`} className={className}>{children}</a>
  return <span className={className}>{children}</span>
}
