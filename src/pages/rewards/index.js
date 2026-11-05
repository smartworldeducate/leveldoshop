import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { ArrowRight, CheckCircle2, Gift, LogIn, Share2, Trophy } from 'lucide-react'

import { OfferTicket } from '../../components/CouponTicket'
import HelpList from '../../components/HelpList'
import PageHero from '../../components/PageHero'
import SectionHead from '../../components/SectionHead'
import StepsCard from '../../components/StepsCard'
import ContactLink from '../../components/ContactLink'
import { useAuth } from '../../context/AuthContext'
import { enterDraw, fetchDraws, fetchMyEntry } from '../../redux/rewards/rewardsSlice'
import { fetchMyPurchases, fetchOffers } from '../../redux/couponSales/couponSalesSlice'
import { whatsappNumber } from '../../data/notifications'
import { drawStatus, entryId, formatDrawDate, timeLeft } from '../../data/rewards'
import { dayCountdown, formatRewardDay, offersOnSale, rewardList } from '../../data/couponSales'

const REWARD_DAY_STEPS = [
  { title: 'Buy a gift coupon', note: 'Pay and upload your receipt.' },
  { title: 'We confirm your payment', note: "You're then on the reward-day list." },
  { title: 'Get your gift', note: 'Every buyer gets it on the reward day.' },
]

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
    <div className={`countdown${left.days === 0 ? ' is-soon' : ''}`} role="timer">
      {parts.map(([label, value]) => (
        <div key={label}>
          <strong>{String(value).padStart(2, '0')}</strong>
          <small>{label}</small>
        </div>
      ))}
    </div>
  )
}

const DRAW_PILL = {
  open: { label: 'Open now', tone: 'open' },
  closed: { label: 'Entries closed', tone: 'wait' },
  due: { label: 'Picking the winner', tone: 'wait' },
  results: { label: 'Results are out', tone: 'done' },
}

/** Where the draw is up to, so nobody has to work it out from two dates. */
function DrawTimeline({ draw, status }) {
  const reached = { open: 0, closed: 1, due: 1, results: 3 }[status] ?? 0
  const steps = [
    { title: 'Entries open', note: `${reached > 0 ? 'Closed' : 'Until'} ${formatDrawDate(draw.closesAt)}` },
    { title: 'Winner picked', note: reached === 3 ? 'At random, from everyone who entered' : 'At random, after entries close' },
    { title: 'Winner announced', note: formatDrawDate(draw.resultsAt) },
  ]
  return (
    <ol className="draw__timeline">
      {steps.map((step, i) => (
        <li key={step.title} className={i < reached ? 'is-done' : i === reached ? 'is-now' : ''}>
          <span>{i < reached ? <CheckCircle2 size={14} /> : null}</span>
          <strong>{step.title}</strong>
          <small>{step.note}</small>
        </li>
      ))}
    </ol>
  )
}

function DrawCard({ draw }) {
  const router = useRouter()
  const dispatch = useDispatch()
  const { user, loading: authLoading } = useAuth()
  const entered = useSelector((s) => s.rewards.entered[draw.id])
  const status = drawStatus(draw).key
  const iWon = Boolean(user && draw.winner?.entryId === entryId(draw.id, user.uid))

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

  const pill = DRAW_PILL[status]
  // Telling a friend adds no entries: everyone has the same single chance.
  const shareText = `Free draw at A-one Grocery: ${draw.prize}. It's free to enter, with no purchase needed. ${typeof window === 'undefined' ? '' : `${window.location.origin}/rewards`}`

  return (
    <article className="draw">
      <div className="draw__prize">
        <span className="draw__prize-icon"><Gift size={30} /></span>
        <small>{status === 'open' ? 'You could win' : 'The prize'}</small>
        <strong>{draw.prize}</strong>
        {status === 'open' && <span className="draw__tag">Free to enter</span>}
      </div>

      <div className="draw__body">
        <div className="draw__head">
          <h3>{draw.title}</h3>
          {pill && <span className={`draw__pill is-${pill.tone}`}>{pill.label}</span>}
        </div>

        {status === 'open' && (
          <div>
            <p className="draw__label">Entries close in</p>
            <Countdown until={draw.closesAt} onEnd={() => closeNow((n) => n + 1)} />
          </div>
        )}

        {status === 'closed' && (
          <div>
            <p className="draw__label">Entries have closed. Winner announced in</p>
            <Countdown until={draw.resultsAt} onEnd={() => closeNow((n) => n + 1)} />
          </div>
        )}
        {status === 'due' && <p className="draw__wait">Entries have closed. The winner will be announced here shortly.</p>}
        {status === 'results' && (
          <p className="draw__winner">
            <Trophy size={22} />
            <span>
              <small>{iWon ? 'Congratulations, you won!' : 'The winner is'}</small>
              <strong>{draw.winner.name}</strong>
              {iWon && <small>We'll contact you on WhatsApp to arrange your prize.</small>}
            </span>
          </p>
        )}
        <DrawTimeline draw={draw} status={status} />

        {status !== 'open' && entered && !iWon && (
          <p className="draw__entered"><CheckCircle2 size={18} /> You entered this draw.</p>
        )}

        {status === 'open' && !authLoading && (
          entered ? (
            <div className="draw__entered-row">
              <p className="draw__entered"><CheckCircle2 size={18} /> You're in this draw. Results on {formatDrawDate(draw.resultsAt)}.</p>
              <a className="draw__share" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">
                <Share2 size={15} /> Tell a friend
              </a>
            </div>
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

        {status === 'open' && (
          <p className="draw__free">No purchase needed. One entry per person. Buying anything doesn't improve your chances.</p>
        )}
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
          <small className="is-soon">The day has passed. <ContactLink /> if you haven't received it.</small>
        )}
      </div>
    </li>
  )
}

/** A link only when there's something on the page to jump to. */
function Way({ href, icon: Icon, title, note, tag }) {
  const Tag = href ? 'a' : 'div'
  return (
    <Tag {...(href ? { href } : {})} className="way-card">
      <span><Icon size={20} /></span>
      <div>
        <strong>{title} {tag && <em>{tag}</em>}</strong>
        <small>{note}</small>
      </div>
      {href && <ArrowRight size={18} className="way-card__arrow" />}
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
  const results = visible
    .filter((d) => drawStatus(d).key === 'results')
    .sort((a, b) => String(b.resultsAt).localeCompare(String(a.resultsAt)))
  // A result stays a full card for a week, so people who entered see it.
  const isRecent = (d) => Date.now() - new Date(d.resultsAt) < 7 * 86_400_000
  const featured = [...running, ...results.filter(isRecent)]
  const finished = results.filter((d) => !isRecent(d))
  const giftCoupons = offersOnSale(offers, shop).filter((o) => o.rewardText)
  // What's still to come is what they came to check; given ones go last.
  const rewardRank = (p) => (p.rewardGivenAt ? 2 : dayCountdown(p.reward.day) ? 0 : 1)
  const myRewards = rewardList(mine).sort((a, b) => rewardRank(a) - rewardRank(b))

  const ready = loaded && offersLoaded && settingsLoaded
  const nothing = !featured.length && !finished.length && !giftCoupons.length && !myRewards.length

  return (
    <>
      <Head>
        <title>Rewards</title>
        <meta name="description" content="Enter our free reward draw, or get a guaranteed gift with a coupon." />
      </Head>

      <div className="offers-page">
        <PageHero
          kicker="A-one rewards"
          title="A little extra with your groceries"
          body="There are two ways to get rewarded here. They're separate, so you can enjoy either one."
        >
          <div className="page-hero__ways">
            <Way
              href={running.length ? '#free-draw' : null}
              icon={Trophy}
              title="Free draw"
              tag="A chance to win"
              note={running.length || !ready ? 'Enter for free. One person is selected at random.' : 'No draw is running right now. Check back soon.'}
            />
            <Way
              href={giftCoupons.length ? '#gift-coupons' : null}
              icon={Gift}
              title="Reward day"
              tag="Guaranteed gift"
              note={giftCoupons.length || !ready ? 'Buy a gift coupon. Every buyer gets the gift on the day.' : 'No gift coupons right now. Check back soon.'}
            />
          </div>
        </PageHero>

        {!user && ready && !nothing && (
          <p className="rewards-signin">
            <LogIn size={16} aria-hidden="true" />
            <span><Link href="/login?next=/rewards">Sign in</Link> to see your rewards and enter draws.</span>
          </p>
        )}

        {myRewards.length > 0 && (
          <section>
            <SectionHead kicker="Yours" title="Your rewards" note="Gifts from coupons you've bought." href="/coupons/mine" linkLabel="My coupons" />
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
            <p>Check back soon, or see what's on the shelves.</p>
            <Link href="/catalog" className="shop-btn">Shop groceries</Link>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <section id="free-draw">
                <SectionHead kicker="Free to enter" title="Free draw" note="Free for everyone. You don't need to buy anything." />
                {featured.map((draw) => <DrawCard key={draw.id} draw={draw} />)}
              </section>
            )}

            {giftCoupons.length > 0 && (
              <section id="gift-coupons">
                <SectionHead kicker="Reward day" title="Coupons with a gift" note="Everyone who buys one gets the gift on its reward day. It isn't a draw, and it doesn't affect any draw." />
                <div className="offers-split">
                  <div className="ticket-list">
                    {giftCoupons.map((offer) => <OfferTicket key={offer.id} offer={offer} />)}
                  </div>
                  <StepsCard title="How reward day works" steps={REWARD_DAY_STEPS} />
                </div>
              </section>
            )}

            {finished.length > 0 && (
              <section>
                <SectionHead kicker="Results" title="Past winners" />
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
