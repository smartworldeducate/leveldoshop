import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { ArrowRight, Ban, Clock, Copy, Gift, TicketPercent } from 'lucide-react'

import ContactLink from '../../components/ContactLink'
import PageHero from '../../components/PageHero'
import PrivateReceipt from '../../components/PrivateReceipt'
import PurchaseSteps from '../../components/PurchaseSteps'
import StepsCard from '../../components/StepsCard'
import useApplyCoupon from '../../lib/useApplyCoupon'
import { useAuth } from '../../context/AuthContext'
import { fetchMyPurchases } from '../../redux/couponSales/couponSalesSlice'
import { lookupCoupon } from '../../lib/placeOrder'
import { formatDate } from '../../lib/analytics'
import { formatMoney } from '../../data/grocery'
import { couponStatus, describeDiscount, discountStub } from '../../data/coupons'
import { dayCountdown, formatRewardDay } from '../../data/couponSales'

const USING_A_CODE = [
  { title: 'Fill your basket', note: 'Add what you need from the shop.' },
  { title: 'Press Use it', note: 'We put the code in your basket for you.' },
  { title: 'Place your order', note: 'The discount comes off your total.' },
]

const PAST_LABEL = { used_up: 'Used', expired: 'Expired', off: 'Not active' }

/** Which group a purchase belongs in. Checking the code may still be under way. */
function groupOf(purchase, codeState) {
  if (purchase.status === 'pending') return 'checking'
  if (purchase.status === 'confirmed' && (!codeState || codeState === 'active')) return 'ready'
  return 'past'
}

function statusLabel(purchase, codeState, group) {
  if (group === 'ready') return 'Ready to use'
  if (group === 'checking') return 'Checking payment'
  if (purchase.status === 'rejected') return 'Payment not confirmed'
  if (purchase.status === 'revoked') return 'Cancelled'
  return PAST_LABEL[codeState] || 'Not active'
}

function daysLeftNote(endsAt) {
  const days = Math.ceil((new Date(endsAt) - new Date()) / 86_400_000)
  return days > 0 && days <= 7 ? ` (${days === 1 ? 'last day' : `${days} days left`})` : ''
}

function MyCoupon({ purchase: p, codeState }) {
  const apply = useApplyCoupon()
  const group = groupOf(p, codeState)
  const ready = group === 'ready'
  const stub = p.coupon && discountStub(p.coupon)
  const StubIcon = group === 'checking' ? Clock : Ban

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(p.couponCode)
      toast.success(`${p.couponCode} copied. Enter it in your basket.`)
    } catch {
      toast(`Enter ${p.couponCode} in your basket`)
    }
  }

  return (
    <article className={`ticket ticket--mine is-${group}`}>
      <div className="ticket__stub">
        {stub ? (
          <>
            <span className="ticket__tag">{ready ? 'Yours' : 'Past'}</span>
            <strong>{stub.big}</strong>
            <span className="ticket__off">{stub.small}</span>
          </>
        ) : (
          <>
            <span className="ticket__tag">{group === 'checking' ? 'Waiting' : 'Past'}</span>
            <StubIcon size={34} aria-hidden="true" />
          </>
        )}
      </div>
      <div className="ticket__tear" aria-hidden="true" />
      <div className="ticket__body">
        <div className="my-coupon__head">
          <h3>{p.offerTitle}</h3>
          <span className="my-coupon__status">{statusLabel(p, codeState, group)}</span>
        </div>
        <p className="my-coupon__meta">
          Bought {formatDate(p.createdAt)} · {formatMoney(p.price)}
          {p.paymentMethod ? ` by ${p.paymentMethod}` : ''}
          {p.token ? ` · Reference ${p.token}` : ''}
        </p>

        {group === 'checking' && (
          <>
            <PurchaseSteps status="pending" />
            <p>We're checking your payment. Your code will appear here, and we'll send it on WhatsApp.</p>
          </>
        )}

        {p.status === 'confirmed' && (
          <div className={`my-coupon__code${ready ? '' : ' is-used'}`}>
            <div>
              <small>{describeDiscount(p.coupon)}. Your code:</small>
              <strong>{p.couponCode}</strong>
              {p.coupon?.endsAt && (
                <small>Use by {formatDate(p.coupon.endsAt)}{ready ? daysLeftNote(p.coupon.endsAt) : ''}</small>
              )}
            </div>
            {ready && (
              <nav aria-label={`Actions for ${p.couponCode}`}>
                <button type="button" aria-label={`Copy code ${p.couponCode}`} onClick={copy}>
                  <Copy size={14} /> Copy
                </button>
                <button type="button" className="my-coupon__use" onClick={() => apply(p.couponCode)}>
                  Use it <ArrowRight size={14} />
                </button>
              </nav>
            )}
          </div>
        )}

        {p.status === 'confirmed' && p.reward?.text && (
          <div className="reward-note">
            <Gift size={20} />
            <div>
              <strong>
                {p.rewardGivenAt
                  ? 'Reward given'
                  : `You're on the reward-day list: ${formatRewardDay(p.reward.day)}${dayCountdown(p.reward.day) ? ` (${dayCountdown(p.reward.day)})` : ''}`}
              </strong>
              <p>{p.reward.text}</p>
            </div>
          </div>
        )}

        {p.status === 'rejected' && (
          <p>{p.rejectNote ? `“${p.rejectNote}” ` : ''}<ContactLink /> if this looks wrong.</p>
        )}
        {p.status === 'revoked' && <p>This code was cancelled.</p>}

        {p.status === 'rejected' && (
          <div className="my-coupon__links"><Link href="/coupons">Buy again</Link></div>
        )}

        {(p.hasReceipt || p.screenshot) && (
          <details className="my-coupon__receipt">
            <summary>See my receipt</summary>
            <PrivateReceipt purchase={p} />
          </details>
        )}
      </div>
    </article>
  )
}

export default function MyCoupons() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { user, loading: authLoading } = useAuth()
  const { mine, mineLoaded } = useSelector((s) => s.couponSales)
  const [states, setStates] = useState({})
  const [tab, setTab] = useState(null)

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

  const groups = useMemo(() => {
    const found = { ready: [], checking: [], past: [] }
    mine.forEach((p) => found[groupOf(p, states[p.id])].push(p))
    return found
  }, [mine, states])

  const tabs = [
    { key: 'ready', label: 'Ready to use' },
    { key: 'checking', label: 'Checking' },
    { key: 'past', label: 'Past' },
  ]
  // Open on what can be used now, then on what's still waiting.
  const active = tab || tabs.find((t) => groups[t.key].length)?.key || 'ready'
  const shown = groups[active]

  return (
    <>
      <Head>
        <title>My coupons</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="offers-page">
        <PageHero
          kicker="My account"
          title="My coupons"
          body={
            groups.ready.length
              ? `You have ${groups.ready.length} ${groups.ready.length === 1 ? 'coupon' : 'coupons'} ready to use.`
              : "Coupons you've bought, and their codes, are all kept here."
          }
          actions={<Link href="/coupons" className="shop-btn shop-btn--ghost">Buy a coupon</Link>}
        />

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
          <div className="offers-split">
            <div className="offers-split__main">
              <div>
                <div className="filter-tabs my-coupons-tabs" role="tablist" aria-label="My coupons">
                  {tabs.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active === key}
                      className={`filter-tabs__tab ${active === key ? 'is-active' : ''}`}
                      onClick={() => setTab(key)}
                    >
                      {label} ({groups[key].length})
                    </button>
                  ))}
                </div>
                {shown.length ? (
                  <div className="ticket-list">
                    {shown.map((p) => <MyCoupon key={p.id} purchase={p} codeState={states[p.id]} />)}
                  </div>
                ) : (
                  <div className="my-orders__empty">
                    <TicketPercent size={32} />
                    <p>{active === 'ready' ? 'Nothing ready to use right now.' : active === 'checking' ? "We're not checking any payments for you." : 'Nothing here yet.'}</p>
                  </div>
                )}
              </div>
            </div>
            <StepsCard title="Using your code" steps={USING_A_CODE} />
          </div>
        )}
      </div>
    </>
  )
}
