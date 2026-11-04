import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { ArrowRight, Clock, Copy, Gift, TicketPercent } from 'lucide-react'

import PrivateReceipt from '../../components/PrivateReceipt'
import PurchaseSteps from '../../components/PurchaseSteps'
import useApplyCoupon from '../../lib/useApplyCoupon'
import { useAuth } from '../../context/AuthContext'
import { fetchMyPurchases } from '../../redux/couponSales/couponSalesSlice'
import { lookupCoupon } from '../../lib/placeOrder'
import { formatDate } from '../../lib/analytics'
import { formatMoney } from '../../data/grocery'
import { couponStatus, describeDiscount } from '../../data/coupons'
import { dayCountdown, formatRewardDay } from '../../data/couponSales'

export default function MyCoupons() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { user, loading: authLoading } = useAuth()
  const { mine, mineLoaded } = useSelector((s) => s.couponSales)
  const [states, setStates] = useState({})
  const apply = useApplyCoupon()

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/login?next=/coupons/mine')
    else dispatch(fetchMyPurchases(user.uid))
  }, [authLoading, user, router, dispatch])

  // Whether each code is still good. Failing to check shouldn't hide the code.
  useEffect(() => {
    mine
      .filter((p) => p.status === 'confirmed')
      .forEach((p) => {
        lookupCoupon(p.couponCode)
          .then((coupon) => setStates((s) => ({ ...s, [p.id]: coupon ? couponStatus(coupon).key : 'off' })))
          .catch(() => {})
      })
  }, [mine])

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success(`${code} copied. Enter it in your basket.`)
    } catch {
      toast(`Enter ${code} in your basket`)
    }
  }

  const usableNow = (p) => p.status === 'confirmed' && (!states[p.id] || states[p.id] === 'active')

  // What can be used comes first, then what's still being checked.
  const sorted = useMemo(() => {
    const rank = (p) => (usableNow(p) ? 0 : p.status === 'pending' ? 1 : 2)
    return [...mine].sort((a, b) => rank(a) - rank(b))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, states])

  const daysLeft = (endsAt) => {
    const days = Math.ceil((new Date(endsAt) - new Date()) / 86_400_000)
    return days > 0 && days <= 7 ? ` · ${days === 1 ? 'last day' : `${days} days left`}` : ''
  }

  const stateLabel = { used_up: 'Used', expired: 'Expired', off: 'Not active' }

  return (
    <>
      <Head>
        <title>My coupons</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="my-orders">
        <section className="my-orders__hero my-orders__hero--slim">
          <div>
            <h1>My coupons</h1>
            <p>Coupons you've bought, and their codes.</p>
          </div>
          <Link href="/coupons" className="shop-btn shop-btn--ghost">Buy a coupon</Link>
        </section>

        {authLoading || !mineLoaded ? (
          <div className="my-order my-order--skeleton" aria-busy="true" aria-label="Loading your coupons" />
        ) : mine.length === 0 ? (
          <div className="my-orders__empty">
            <TicketPercent size={36} />
            <h2>No coupons yet</h2>
            <p>Coupons you buy will appear here.</p>
            <Link href="/coupons" className="shop-btn">See coupons</Link>
          </div>
        ) : (
          <div className="my-orders__list">
            {sorted.map((p) => {
              const state = states[p.id]
              const usable = usableNow(p)
              return (
                <article key={p.id} className="my-order">
                  <header className="my-order__head">
                    <div>
                      <span className="my-order__id">{p.offerTitle}</span>
                      <span className="my-order__date">
                        {formatDate(p.createdAt)} · {formatMoney(p.price)}
                        {p.paymentMethod ? ` by ${p.paymentMethod}` : ''}
                        {p.token ? ` · ${p.token}` : ''}
                      </span>
                    </div>
                    {p.status === 'pending' && (
                      <span className="my-order__status my-order__status--pending"><Clock size={14} /> Checking payment</span>
                    )}
                    {p.status === 'rejected' && <span className="my-order__status my-order__status--problem">Payment not confirmed</span>}
                    {p.status === 'revoked' && <span className="my-order__status my-order__status--cancelled">Cancelled</span>}
                    {p.status === 'confirmed' && (
                      <span className={`my-order__status my-order__status--${usable ? 'done' : 'cancelled'}`}>
                        {usable ? 'Ready to use' : stateLabel[state]}
                      </span>
                    )}
                  </header>

                  {p.status === 'pending' && (
                    <>
                      <PurchaseSteps status="pending" />
                      <p className="my-order__hint coupon-note">We're checking your payment. Your code will appear here, and we'll send it on WhatsApp.</p>
                    </>
                  )}
                  {p.status === 'rejected' && (
                    <p className="my-order__hint coupon-note">
                      {p.rejectNote ? `“${p.rejectNote}” ` : ''}<Link href="/contact">Contact us</Link> if this looks wrong.
                    </p>
                  )}
                  {p.status === 'rejected' && p.offerId && (
                    <p className="my-coupon__links"><Link href={`/coupons/${p.offerId}`}>Try again</Link></p>
                  )}
                  {p.status === 'revoked' && <p className="my-order__hint coupon-note">This code was cancelled.</p>}
                  {p.status === 'confirmed' && p.reward?.text && (
                    <div className="reward-note">
                      <Gift size={20} />
                      <div>
                        <strong>{p.rewardGivenAt ? 'Reward given' : `You're on the reward-day list: ${formatRewardDay(p.reward.day)}${dayCountdown(p.reward.day) ? ` (${dayCountdown(p.reward.day)})` : ''}`}</strong>
                        <p>{p.reward.text}</p>
                      </div>
                    </div>
                  )}
                  {p.status === 'confirmed' && (
                    <div className="coupon-code">
                      <div>
                        <strong>{describeDiscount(p.coupon)}</strong>
                        {p.coupon?.endsAt && <small>Use by {formatDate(p.coupon.endsAt)}{usable ? daysLeft(p.coupon.endsAt) : ''}</small>}
                      </div>
                      <div className="coupon-code__actions">
                        <button type="button" disabled={!usable} aria-label={`Copy code ${p.couponCode}`} onClick={() => copy(p.couponCode)}>
                          <span>{p.couponCode}</span> <Copy size={14} />
                        </button>
                        {usable && (
                          <button type="button" className="coupon-code__use" onClick={() => apply(p.couponCode)}>
                            Use it <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {(p.hasReceipt || p.screenshot) && (
                    <details className="my-coupon__receipt">
                      <summary>See my receipt</summary>
                      <PrivateReceipt purchase={p} />
                    </details>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
