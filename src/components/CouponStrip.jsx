import React from 'react'
import { useSelector } from 'react-redux'

import { FreeTicket, OfferTicket } from './CouponTicket'
import { offersOnSale } from '../data/couponSales'

/**
 * Tickets for coupons on sale and the free codes marked to show on the website.
 * Shows three at most: the coupon page has the rest. Empty: draws nothing.
 */
export default function CouponStrip() {
  const coupons = useSelector((state) => state.coupons.site)
  const offers = useSelector((state) => state.couponSales.offers)
  const shop = useSelector((state) => state.settings.values.couponShop)
  const forSale = offersOnSale(offers, shop).slice(0, 3)
  const free = coupons.slice(0, 3 - forSale.length)

  if (!forSale.length && !free.length) return null

  return (
    <div className="ticket-grid">
      {forSale.map((offer) => <OfferTicket key={offer.id} offer={offer} compact />)}
      {free.map((coupon) => <FreeTicket key={coupon.code} coupon={coupon} compact />)}
    </div>
  )
}
