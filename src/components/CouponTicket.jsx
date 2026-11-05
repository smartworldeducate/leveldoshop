import React from 'react'
import { useSelector } from 'react-redux'
import { CalendarClock, Copy, Flame, Gift } from 'lucide-react'

import OfferBuyButton from './OfferBuyButton'
import useApplyCoupon from '../lib/useApplyCoupon'
import { categoryLabel, formatMoney } from '../data/grocery'
import { describeDiscount, describeTerms, discountStub } from '../data/coupons'
import { dayCountdown, formatRewardDay, offerLeft, offerStatus } from '../data/couponSales'

const Stub = ({ coupon, tag }) => {
  const { big, small } = discountStub(coupon)
  return (
    <div className="ticket__stub">
      <span className="ticket__tag">{tag}</span>
      <strong>{big}</strong>
      <span className="ticket__off">{small}</span>
    </div>
  )
}

// The name often says it already ("20% off voucher"): no need to say it twice.
const Gives = ({ coupon, title }) => {
  const text = describeDiscount(coupon)
  if (String(title || '').toLowerCase().includes(text.toLowerCase())) return null
  return <p className="ticket__gives">{text}</p>
}

// Where the ticket would tear: a dashed line between two punched notches.
const Tear = () => <div className="ticket__tear" aria-hidden="true" />

const useTerms = (coupon) => {
  const categories = useSelector((state) => state.categories.items)
  return describeTerms(coupon, (slug) => categoryLabel(categories, slug))
}

/**
 * A coupon on sale. `compact` is for Home, where the coupon page holds the small
 * print. `preview` is for the dashboard: it looks the same but does nothing.
 */
export function OfferTicket({ offer, compact = false, preview = false }) {
  const terms = useTerms(offer)
  const soldOut = offerStatus(offer).key === 'sold_out'
  const left = offerLeft(offer)
  const when = dayCountdown(offer.rewardDay)

  return (
    <article className={`ticket${soldOut ? ' is-sold-out' : ''}`}>
      <Stub coupon={offer} tag="To buy" />
      <Tear />
      <div className="ticket__body">
        <h3>{offer.title || 'Your coupon name'}</h3>
        <Gives coupon={offer} title={offer.title} />
        {!compact && offer.description && <p>{offer.description}</p>}
        {!compact && (
          <ul className="ticket__terms">
            {terms.map((term) => <li key={term}>{term}</li>)}
            <li>{offer.validDays > 0 ? `Lasts ${offer.validDays} days` : 'No expiry'}</li>
            <li>Works once</li>
          </ul>
        )}
        {offer.rewardText && (
          <p className="ticket__reward">
            <Gift size={15} />
            <span>Every buyer gets: {offer.rewardText}{offer.rewardDay ? `, on ${formatRewardDay(offer.rewardDay)}` : ''}{when ? ` (${when})` : ''}</span>
          </p>
        )}
        {!soldOut && left !== null && left <= 5 && (
          <p className="ticket__left"><Flame size={15} /> Only {left} left</p>
        )}
        <div className="ticket__foot">
          <div className="ticket__price">
            <small>You pay</small>
            <strong>{formatMoney(offer.price)}</strong>
          </div>
          {soldOut && <span className="ticket__soldout">Sold out</span>}
          {!soldOut && !preview && <OfferBuyButton offerId={offer.id} />}
          {!soldOut && preview && (
            <div className="offer-copy" aria-hidden="true">
              <span>TKN-XXXXXX</span>
              <small>Copy to buy <Copy size={14} /></small>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

/** A code anyone can use for free. */
export function FreeTicket({ coupon, code = coupon.code, compact = false, preview = false }) {
  const terms = useTerms(coupon)
  const apply = useApplyCoupon()
  const Button = preview ? 'div' : 'button'
  const action = preview
    ? { 'aria-hidden': true }
    : { type: 'button', 'aria-label': `Copy code ${code} and continue`, onClick: () => apply(code) }

  return (
    <article className="ticket ticket--free">
      <Stub coupon={coupon} tag="Free" />
      <Tear />
      <div className="ticket__body">
        <h3>{coupon.label || 'Discount code'}</h3>
        <Gives coupon={coupon} title={coupon.label} />
        {!compact && terms.length > 0 && (
          <ul className="ticket__terms">
            {terms.map((term) => <li key={term}>{term}</li>)}
          </ul>
        )}
        {compact && coupon.endsAt && (
          <p className="ticket__ends">
            <CalendarClock size={15} />
            Ends {new Date(coupon.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </p>
        )}
        <div className="ticket__foot">
          <div className="ticket__price">
            <small>You pay</small>
            <strong>Free</strong>
          </div>
          <Button className="offer-copy" {...action}>
            <span>{code || 'YOURCODE'}</span>
            <small>Copy and use <Copy size={14} /></small>
          </Button>
        </div>
      </div>
    </article>
  )
}
