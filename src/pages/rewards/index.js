import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { CalendarClock, CheckCircle2, Gift, Sparkles, Trophy } from 'lucide-react'

import { OfferTicket, ticketGridClass } from '../../components/CouponTicket'
import HelpList from '../../components/HelpList'
import { useAuth } from '../../context/AuthContext'
import { enterDraw, fetchDraws, fetchMyEntry } from '../../redux/rewards/rewardsSlice'
import { fetchMyPurchases, fetchOffers } from '../../redux/couponSales/couponSalesSlice'
import { whatsappNumber } from '../../data/notifications'
import { drawStatus, formatDrawDate, timeLeft } from '../../data/rewards'
import { dayCountdown, formatRewardDay, offersOnSale, rewardList } from '../../data/couponSales'

/** Ticks while it's on screen, and says when it reaches zero so the draw can close. */
function Countdown({ until, onEnd }) {
  const [left, setLeft] = useState(() => timeLeft(until))

  useEffect(() => {
    const timer = setInterval(() => {
      const next = timeLeft(until)
      setLeft(next)
      if (!next) {
        clearInterval(timer)
        onEnd()
      }
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until])

  if (!left) return null

  const parts = [
    ['days', left.days],
    ['hours', left.hours],
    ['mins', left.minutes],
    ['secs', left.seconds],
  ]

  return (
    <div className="countdown" role="timer">
      {parts.map(([label, value]) => (
        <div key={label}>
          <strong>{String(value).padStart(2, '0')}</strong>
          <small>{label}</small>
        </div>
      ))}
    </div>
  )
}

function DrawCard({ draw }) {
  const router = useRouter()
  const dispatch = useDispatch()
  const { user, loading: authLoading } = useAuth()
  const entered = useSelector((s) => s.rewards.entered[draw.id])
  const status = drawStatus(draw).key

  const [, closeNow] = useState(0)
  const [entering, setEntering] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      dispatch(fetchMyEntry({ drawId: draw.id, uid: user.uid }))
      setName((prev) => prev || user.displayName || '')
    }
  }, [dispatch, draw.id, user])

  const start = () => {
    if (user) setEntering(true)
    else router.push('/login?next=/rewards')
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!name.trim()) found.name = 'Enter your name'
    if (!whatsappNumber(phone)) found.phone = 'Enter a valid phone number'
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      await dispatch(enterDraw({ drawId: draw.id, name, phone })).unwrap()
      toast.success("You're in the draw. Good luck!")
    } catch {
      toast.error('We could not enter you. Please try again.')
    }
    setSaving(false)
  }

  return (
    <article className="draw">
      <div className="draw__prize">
        <Gift size={38} />
        <small>You could win</small>
        <strong>{draw.prize}</strong>
        <span className="draw__tag">Free to enter</span>
      </div>

      <div className="draw__body">
        <h3>{draw.title}</h3>

        {status === 'open' && (
          <div>
            <p className="draw__label">Entries close in</p>
            <Countdown until={draw.closesAt} onEnd={() => closeNow((n) => n + 1)} />
          </div>
        )}

        <div className="draw__when">
          <span><CalendarClock size={15} /> Entries close <strong>{formatDrawDate(draw.closesAt)}</strong></span>
          <span><Trophy size={15} /> Winner announced <strong>{formatDrawDate(draw.resultsAt)}</strong></span>
        </div>

        {status === 'due' && <p className="draw__wait">Entries have closed. The winner will be announced here shortly.</p>}
        {status === 'closed' && <p className="draw__wait">Entries have closed. Come back on the results date to see who was selected.</p>}

        {status === 'open' && !authLoading && (
          entered ? (
            <p className="draw__entered"><CheckCircle2 size={18} /> You're in this draw. Results on {formatDrawDate(draw.resultsAt)}.</p>
          ) : entering ? (
            <form className="checkout-fields draw__form" onSubmit={submit} noValidate>
              <div className="checkout-field">
                <label htmlFor={`draw-name-${draw.id}`}>Your name</label>
                <input id={`draw-name-${draw.id}`} value={name} autoComplete="name" aria-invalid={Boolean(errors.name)} onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: '' })) }} />
                <small className={errors.name ? 'is-error' : ''}>{errors.name}</small>
              </div>
              <div className="checkout-field">
                <label htmlFor={`draw-phone-${draw.id}`}>WhatsApp number</label>
                <input id={`draw-phone-${draw.id}`} type="tel" value={phone} autoComplete="tel" placeholder="03001234567" aria-invalid={Boolean(errors.phone)} onChange={(e) => { setPhone(e.target.value); setErrors((prev) => ({ ...prev, phone: '' })) }} />
                <small className={errors.phone ? 'is-error' : ''}>{errors.phone || "We'll contact you here if you win."}</small>
              </div>
              <div className="checkout-field--wide">
                <button type="submit" className="shop-btn" disabled={saving}>{saving ? 'Entering…' : 'Enter the draw for free'}</button>
              </div>
            </form>
          ) : (
            <button type="button" className="shop-btn draw__enter" onClick={start}>
              <Gift size={16} /> {user ? 'Enter for free' : 'Sign in to enter for free'}
            </button>
          )
        )}

        <p className="draw__free">No purchase needed. One entry per person. Buying anything doesn't improve your chances.</p>
        {draw.terms && (
          <details className="draw__rules">
            <summary>Rules</summary>
            <p>{draw.terms}</p>
          </details>
        )}
      </div>
    </article>
  )
}

/** A buyer's own reward, once staff have confirmed their payment. */
function MyReward({ purchase }) {
  const { day, text } = purchase.reward
  const date = new Date(`${day}T00:00:00`)
  const when = dayCountdown(day)

  return (
    <li>
      <div className="reward-date" aria-hidden="true">
        <span>{date.toLocaleDateString('en-GB', { month: 'short' })}</span>
        <strong>{date.getDate()}</strong>
      </div>
      <div>
        <strong>{text}</strong>
        <small>From {purchase.offerTitle}</small>
        {purchase.rewardGivenAt ? (
          <small className="is-given">Given to you</small>
        ) : when ? (
          <small className="is-soon">{formatRewardDay(day)} ({when})</small>
        ) : (
          <small className="is-soon">The day has passed. <Link href="/contact">Contact us</Link> if you haven't received it.</small>
        )}
      </div>
    </li>
  )
}

/** A link only when there's something on the page to jump to. */
function Way({ href, icon: Icon, title, note }) {
  const Tag = href ? 'a' : 'div'
  return (
    <Tag {...(href ? { href } : {})} className="rewards-hero__way">
      <span><Icon size={20} /></span>
      <div>
        <strong>{title}</strong>
        <small>{note}</small>
      </div>
    </Tag>
  )
}

export default function Rewards() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const { draws, loaded } = useSelector((s) => s.rewards)
  const { offers, offersLoaded, mine } = useSelector((s) => s.couponSales)
  const shop = useSelector((s) => s.settings.values.couponShop)
  const settingsLoaded = useSelector((s) => s.settings.loaded)

  useEffect(() => {
    dispatch(fetchDraws())
    dispatch(fetchOffers())
  }, [dispatch])

  useEffect(() => {
    if (user) dispatch(fetchMyPurchases(user.uid))
  }, [dispatch, user])

  const visible = draws.filter((d) => d.visible !== false)
  const running = visible
    .filter((d) => drawStatus(d).key !== 'results')
    .sort((a, b) => {
      // Ones people can still enter come first, closing soonest at the top.
      const open = (d) => (drawStatus(d).key === 'open' ? 0 : 1)
      return open(a) - open(b) || String(a.closesAt).localeCompare(String(b.closesAt))
    })
  const finished = visible
    .filter((d) => drawStatus(d).key === 'results')
    .sort((a, b) => String(b.resultsAt).localeCompare(String(a.resultsAt)))
  const giftCoupons = offersOnSale(offers, shop).filter((o) => o.rewardText)
  // What's still to come is what they came to check; given ones go last.
  const rewardRank = (p) => (p.rewardGivenAt ? 2 : dayCountdown(p.reward.day) ? 0 : 1)
  const myRewards = rewardList(mine).sort((a, b) => rewardRank(a) - rewardRank(b))

  const ready = loaded && offersLoaded && settingsLoaded
  const nothing = !running.length && !finished.length && !giftCoupons.length && !myRewards.length

  return (
    <>
      <Head>
        <title>Rewards</title>
        <meta name="description" content="Enter our free reward draw, or get a guaranteed gift with a coupon." />
      </Head>

      <div className="rewards">
        <section className="rewards-hero">
          <div className="rewards-hero__copy">
            <span className="rewards-hero__eyebrow"><Sparkles size={14} /> A-one rewards</span>
            <h1>A little extra with your groceries</h1>
            <p>There are two ways to get rewarded here. They're separate, so you can enjoy either one.</p>
          </div>
          <div className="rewards-hero__ways">
            <Way
              href={running.length ? '#free-draw' : null}
              icon={Trophy}
              title="Free draw"
              note={running.length || !ready ? 'Enter for free. One person is selected at random.' : 'No draw is running right now. Check back soon.'}
            />
            <Way
              href={giftCoupons.length ? '#gift-coupons' : null}
              icon={Gift}
              title="Reward day"
              note={giftCoupons.length || !ready ? 'Buy a gift coupon. Every buyer gets the gift on the day.' : 'No gift coupons right now. Check back soon.'}
            />
          </div>
        </section>

        {myRewards.length > 0 && (
          <section>
            <header className="rewards__head">
              <h2>Your rewards</h2>
              <p>Gifts from coupons you've bought. See your codes under <Link href="/coupons/mine">My coupons</Link>.</p>
            </header>
            <ul className="my-rewards">
              {myRewards.map((p) => <MyReward key={p.id} purchase={p} />)}
            </ul>
          </section>
        )}

        {!ready ? (
          <div className="my-order my-order--skeleton" aria-busy="true" aria-label="Loading rewards" />
        ) : nothing ? (
          <div className="my-orders__empty">
            <Gift size={36} />
            <h2>No rewards right now</h2>
            <p>Check back soon, or see this week's deals.</p>
            <Link href="/deals" className="shop-btn">See deals</Link>
          </div>
        ) : (
          <>
            {running.length > 0 && (
              <section id="free-draw">
                <header className="rewards__head">
                  <h2>Free draw</h2>
                  <p>Free for everyone. You don't need to buy anything.</p>
                </header>
                {running.map((draw) => <DrawCard key={draw.id} draw={draw} />)}
              </section>
            )}

            {giftCoupons.length > 0 && (
              <section id="gift-coupons">
                <header className="rewards__head">
                  <h2>Coupons with a gift</h2>
                  <p>Everyone who buys one gets the gift on its reward day. It isn't a draw, and it doesn't affect any draw.</p>
                </header>
                <div className={ticketGridClass(giftCoupons.length)}>
                  {giftCoupons.map((offer) => <OfferTicket key={offer.id} offer={offer} />)}
                </div>
              </section>
            )}

            {finished.length > 0 && (
              <section>
                <header className="rewards__head">
                  <h2>Past winners</h2>
                </header>
                <ul className="past-winners">
                  {finished.map((draw) => (
                    <li key={draw.id}>
                      <Trophy size={20} />
                      <strong>{draw.winner.name}</strong>
                      <span>won {draw.prize}</span>
                      <small>{draw.title}, {formatDrawDate(draw.resultsAt)}</small>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <HelpList
              title="Questions about rewards"
              items={[
                { q: 'Is the free draw really free?', a: "Yes. Anyone can enter, once, without buying anything." },
                { q: 'Does buying a coupon improve my chances?', a: "No. Coupons have nothing to do with the draw, and everyone who enters has the same chance." },
                { q: 'How is the winner chosen?', a: 'At random, from everyone who entered, after entries close. We contact the winner on WhatsApp.' },
                { q: 'How do I get a reward-day gift?', a: "Buy a coupon that includes a gift. Once we've confirmed your payment, you get the gift on its reward day." },
              ]}
            />

            <p className="rewards-more">Looking for discounts? <Link href="/coupons">See all coupons</Link></p>
          </>
        )}
      </div>
    </>
  )
}
