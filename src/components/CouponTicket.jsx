import React from 'react'
import { useSelector } from 'react-redux'
import { CalendarClock, Check, Copy, Flame, Gift, Star } from 'lucide-react'

import OfferBuyButton from './OfferBuyButton'
import useApplyCoupon from '../lib/useApplyCoupon'
import { categoryLabel, formatMoney } from '../data/grocery'
import { describeTerms, discountStub, endsInDays, endsInLabel } from '../data/coupons'
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

// The stub shows the discount, so this only adds what the stub can't: its cap.
const Cap = ({ coupon }) =>
  Number(coupon?.maxDiscount) > 0 ? <p className="ticket__gives">Up to {formatMoney(coupon.maxDiscount)} off</p> : null

// Worth saying: it's the first thing people wonder about a code.
const wholeShop = (coupon) => (coupon?.categorySlugs?.length ? [] : ['All aisles'])

const Terms = ({ items }) =>
  items.length > 0 && (
    <ul className="ticket__terms">
      {items.map((term) => <li key={term}><Check size={12} strokeWidth={3} aria-hidden="true" /> {term}</li>)}
    </ul>
  )

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
export function OfferTicket({ offer, compact = false, preview = false, popular = false }) {
  const terms = useTerms(offer)
  const soldOut = offerStatus(offer).key === 'sold_out'
  const left = offerLeft(offer)
  const when = dayCountdown(offer.rewardDay)
  const fewLeft = !soldOut && left !== null && left <= 5

  return (
    <article className={`ticket${soldOut ? ' is-sold-out' : ''}`}>
      <Stub coupon={offer} tag="To buy" />
      <Tear />
      <div className="ticket__body ticket__body--split">
        <div className="ticket__info">
          <div className="ticket__head">
            <h3>{offer.title || 'Your coupon name'}</h3>
            {popular && !soldOut && <span className="ticket__flag"><Star size={12} /> Popular</span>}
            {fewLeft && <span className="ticket__flag ticket__flag--hot"><Flame size={12} /> Only {left} left</span>}
          </div>
          <Cap coupon={offer} />
          {!compact && offer.description && <p>{offer.description}</p>}
          {!compact && (
            <Terms items={[...terms, ...wholeShop(offer), offer.validDays > 0 ? `Lasts ${offer.validDays} days` : 'No expiry', 'Works once']} />
          )}
          {offer.rewardText && (
            <div className="ticket__reward">
              <span className="ticket__reward-icon"><Gift size={16} /></span>
              <p>
                <small>Every buyer gets</small>
                <strong>{offer.rewardText}</strong>
                {offer.rewardDay && <small>on {formatRewardDay(offer.rewardDay)}{when ? ` (${when})` : ''}</small>}
              </p>
            </div>
          )}
        </div>
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
  const ending = endsInDays(coupon)
  const Button = preview ? 'div' : 'button'
  const action = preview
    ? { 'aria-hidden': true }
    : { type: 'button', 'aria-label': `Copy code ${code} and continue`, onClick: () => apply(code) }

  return (
    <article className="ticket ticket--free">
      <Stub coupon={coupon} tag="Free" />
      <Tear />
      <div className="ticket__body ticket__body--split">
        <div className="ticket__info">
          <div className="ticket__head">
            <h3>{coupon.label || 'Discount code'}</h3>
            {ending !== null && <span className="ticket__flag ticket__flag--hot"><CalendarClock size={12} /> {endsInLabel(ending)}</span>}
          </div>
          <Cap coupon={coupon} />
          {!compact && <Terms items={[...terms, ...wholeShop(coupon)]} />}
          {compact && coupon.endsAt && ending === null && (
            <p className="ticket__ends">
              <CalendarClock size={15} />
              Ends {new Date(coupon.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
        <div className="ticket__foot">
          <div className="ticket__price">
            <small>Price</small>
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
