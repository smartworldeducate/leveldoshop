import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowRight, BadgeCheck, Gift, Globe2, LockKeyhole, TicketPercent } from 'lucide-react'

import { FreeTicket, OfferTicket } from '../../components/CouponTicket'
import HelpList from '../../components/HelpList'
import PageHero from '../../components/PageHero'
import SectionHead from '../../components/SectionHead'
import StepsCard from '../../components/StepsCard'

import { fetchOffers } from '../../redux/couponSales/couponSalesSlice'
import { fetchSiteCoupons } from '../../redux/coupons/couponsSlice'
import { fetchDraws } from '../../redux/rewards/rewardsSlice'
import { couponShopIsOpen, offerStatus } from '../../data/couponSales'
import { formatMoney } from '../../data/grocery'
import { discountStub } from '../../data/coupons'
import { drawStatus, formatDrawDate } from '../../data/rewards'

const HOW_TO_BUY = [
  { title: 'Choose a coupon', note: 'Press Copy to buy. The payment page opens.' },
  { title: 'Send the money', note: 'By any method we list for your country.' },
  { title: 'Upload your receipt', note: 'A screenshot or photo is fine.' },
  { title: 'Get your own code', note: 'We check your payment, then send it to you.' },
]

const HERO_POINTS = [
  { icon: BadgeCheck, text: 'A code made just for you' },
  { icon: LockKeyhole, text: 'Your receipt stays private' },
  { icon: Globe2, text: 'Pay the way that suits your country' },
]

// A coupon only counts as popular once a few people have really bought it.
const POPULAR_FROM = 5

/** The two best offers, drawn as real tickets in the header. Decoration: the list below has the details. */
function HeroDeck({ front, back }) {
  const Card = ({ item, className }) => (
    <div className={`hero-deck__card ${className}`}>
      <span>A-one Grocery</span>
      <strong>{discountStub(item).big}</strong>
      <small>OFF</small>
      <i />
      <em>{item.price > 0 ? `Yours for ${formatMoney(item.price)}` : 'Free code'}</em>
    </div>
  )
  return (
    <div className="hero-deck" aria-hidden="true">
      {back && <Card item={back} className="is-back" />}
      <Card item={front} className="is-front" />
    </div>
  )
}

export default function CouponShop() {
  const dispatch = useDispatch()
  const { offers, offersLoaded } = useSelector((s) => s.couponSales)
  const shop = useSelector((s) => s.settings.values.couponShop)
  const settingsLoaded = useSelector((s) => s.settings.loaded)
  const free = useSelector((s) => s.coupons.site)
  const draws = useSelector((s) => s.rewards.draws)
  const [view, setView] = useState('all')

  useEffect(() => {
    dispatch(fetchOffers())
    dispatch(fetchSiteCoupons())
    dispatch(fetchDraws())
  }, [dispatch])

  // Ones people can buy come first; sold out stays visible, at the end.
  const listed = couponShopIsOpen(shop)
    ? offers
        .filter((o) => ['on_sale', 'sold_out'].includes(offerStatus(o).key))
        .sort((a, b) => Number(offerStatus(a).key === 'sold_out') - Number(offerStatus(b).key === 'sold_out'))
    : []
  const openDraw = draws.find((d) => drawStatus(d).key === 'open')
  const buyable = listed.filter((o) => offerStatus(o).key === 'on_sale')
  const [best, runnerUp] = [...buyable, ...free]
  const topSeller = buyable.reduce((top, o) => ((o.soldCount || 0) > (top?.soldCount || 0) ? o : top), null)
  const popularId = (topSeller?.soldCount || 0) >= POPULAR_FROM ? topSeller.id : null

  const gifts = listed.filter((o) => o.rewardText)
  const views = [
    { key: 'all', label: 'All', count: listed.length + free.length },
    { key: 'buy', label: 'To buy', count: listed.length },
    { key: 'free', label: 'Free', count: free.length },
    { key: 'gift', label: 'With a gift', count: gifts.length },
  ].filter((v) => v.key === 'all' || v.count > 0)
  // A choice only helps when there's more than one kind of thing to choose between.
  const showViews = listed.length > 0 && (free.length > 0 || gifts.length > 0)
  const shownOffers = view === 'gift' ? gifts : view === 'free' ? [] : listed
  const shownFree = view === 'all' || view === 'free' ? free : []

  return (
    <>
      <Head>
        <title>Coupons</title>
        <meta name="description" content="Buy a coupon or use a free code, and save on your groceries." />
      </Head>

      <div className="offers-page">
        <PageHero
          kicker="Coupons"
          title="Save more on every basket"
          body="Buy a coupon or use a free code. Every coupon you buy gets its own code that works once."
          actions={
            <>
              {best && <a href="#coupon-list" className="shop-btn">See coupons <ArrowRight size={16} /></a>}
              <Link href="/coupons/mine" className="shop-btn shop-btn--ghost">My coupons</Link>
            </>
          }
          points={HERO_POINTS}
        >
          {best && <HeroDeck front={best} back={runnerUp} />}
        </PageHero>

        {!settingsLoaded || !offersLoaded ? (
          <div className="my-order my-order--skeleton" aria-busy="true" aria-label="Loading coupons" />
        ) : !listed.length && !free.length ? (
          <div className="my-orders__empty">
            <TicketPercent size={36} />
            <h2>No coupons right now</h2>
            <p>Check back soon, or see what's on the shelves.</p>
            <Link href="/catalog" className="shop-btn">Shop groceries</Link>
          </div>
        ) : (
          <div id="coupon-list" className={`offers-anchor ${listed.length ? 'offers-split' : ''}`}>
            <div className="offers-split__main">
              {showViews && (
                <div className="filter-tabs offers-views" role="tablist" aria-label="Show coupons">
                  {views.map(({ key, label, count }) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={view === key}
                      className={`filter-tabs__tab ${view === key ? 'is-active' : ''}`}
                      onClick={() => setView(key)}
                    >
                      {label} ({count})
                    </button>
                  ))}
                </div>
              )}

              {shownOffers.length > 0 && (
                <section>
                  <SectionHead kicker="To buy" title="Coupons to buy" note="Press Copy to buy to start. You get your own code once we've checked your payment." />
                  <div className="ticket-list">
                    {shownOffers.map((offer) => <OfferTicket key={offer.id} offer={offer} popular={offer.id === popularId} />)}
                  </div>
                </section>
              )}

              {shownFree.length > 0 && (
                <section>
                  <SectionHead kicker="Free" title="Free codes" note="Nothing to pay. Copy one and use it in your basket." />
                  <div className="ticket-list">
                    {shownFree.map((coupon) => <FreeTicket key={coupon.code} coupon={coupon} />)}
                  </div>
                </section>
              )}
            </div>

            {listed.length > 0 && (
              <StepsCard title="How buying works" steps={HOW_TO_BUY}>
                <p className="steps-card__note">
                  <LockKeyhole size={15} />
                  Your receipt stays private. Only you and our staff can see it.
                </p>
              </StepsCard>
            )}
          </div>
        )}

        {listed.length > 0 && (
          <HelpList
            title="Questions about buying a coupon"
            items={[
              { q: 'How do I pay?', a: "Copy a coupon's code, choose a payment method, send the exact amount and upload your receipt." },
              { q: 'When do I get my code?', a: `Once we've checked your payment${shop?.checkTime ? `, within ${shop.checkTime}` : ''}. We send it on WhatsApp, and it appears under My coupons.` },
              { q: 'Who can see my receipt?', a: "Only you and our staff. It has no public link, and we only use it to check your payment." },
              { q: 'How do I use my coupon?', a: 'Enter your code in your basket, or press Use it under My coupons. Each code works once.' },
              { q: "What if my payment can't be confirmed?", a: "We'll tell you why under My coupons, and you can contact us or try again." },
            ]}
          />
        )}

        {openDraw && (
          <aside className="draw-banner">
            <span className="draw-banner__icon"><Gift size={24} /></span>
            <div>
              <strong>Free reward draw: {openDraw.title}</strong>
              <p>Results on {formatDrawDate(openDraw.resultsAt)}. No purchase needed, and buying a coupon doesn't affect your chances.</p>
            </div>
            <Link href="/rewards" className="shop-btn shop-btn--ghost">See the draw</Link>
          </aside>
        )}
      </div>
    </>
  )
}
