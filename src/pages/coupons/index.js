import { useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useDispatch, useSelector } from 'react-redux'
import { Gift, LockKeyhole, TicketPercent } from 'lucide-react'

import { FreeTicket, OfferTicket } from '../../components/CouponTicket'
import HelpList from '../../components/HelpList'
import PageHero from '../../components/PageHero'
import SectionHead from '../../components/SectionHead'
import StepsCard from '../../components/StepsCard'

import { fetchOffers } from '../../redux/couponSales/couponSalesSlice'
import { fetchSiteCoupons } from '../../redux/coupons/couponsSlice'
import { fetchDraws } from '../../redux/rewards/rewardsSlice'
import { couponShopIsOpen, offerStatus } from '../../data/couponSales'
import { discountStub } from '../../data/coupons'
import { drawStatus, formatDrawDate } from '../../data/rewards'

const HOW_TO_BUY = [
  { title: 'Copy the code', note: 'It opens the payment page.' },
  { title: 'Send the money', note: 'By any method we list.' },
  { title: 'Upload your receipt', note: 'A screenshot or photo.' },
  { title: 'Use your coupon', note: 'We check your payment, then send your code.' },
]

export default function CouponShop() {
  const dispatch = useDispatch()
  const { offers, offersLoaded } = useSelector((s) => s.couponSales)
  const shop = useSelector((s) => s.settings.values.couponShop)
  const settingsLoaded = useSelector((s) => s.settings.loaded)
  const free = useSelector((s) => s.coupons.site)
  const draws = useSelector((s) => s.rewards.draws)

  useEffect(() => {
    dispatch(fetchOffers())
    dispatch(fetchSiteCoupons())
    dispatch(fetchDraws())
  }, [dispatch])

  const listed = couponShopIsOpen(shop)
    ? offers.filter((o) => ['on_sale', 'sold_out'].includes(offerStatus(o).key))
    : []
  const openDraw = draws.find((d) => drawStatus(d).key === 'open')
  const best = listed.find((o) => offerStatus(o).key === 'on_sale') || free[0]

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
          actions={<Link href="/coupons/mine" className="shop-btn shop-btn--ghost">My coupons</Link>}
        >
          {best && (
            <div className="hero-ticket" aria-hidden="true">
              <span>{best.price > 0 ? 'Coupon' : 'Free code'}</span>
              <strong>{discountStub(best).big}</strong>
              <small>OFF</small>
            </div>
          )}
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
          <div className={listed.length ? 'offers-split' : ''}>
            <div className="offers-split__main">
              {listed.length > 0 && (
                <section>
                  <SectionHead kicker="To buy" title="Coupons to buy" note="Copy a code to start buying." />
                  <div className="ticket-list">
                    {listed.map((offer) => <OfferTicket key={offer.id} offer={offer} />)}
                  </div>
                </section>
              )}

              {free.length > 0 && (
                <section>
                  <SectionHead kicker="Free" title="Free codes" note="Nothing to pay. Copy one and use it in your basket." />
                  <div className="ticket-list">
                    {free.map((coupon) => <FreeTicket key={coupon.code} coupon={coupon} />)}
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
            <Gift size={26} />
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
