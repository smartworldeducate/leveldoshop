import { useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useDispatch, useSelector } from 'react-redux'
import { Gift, TicketPercent } from 'lucide-react'

import { FreeTicket, OfferTicket, ticketGridClass } from '../../components/CouponTicket'
import HelpList from '../../components/HelpList'

import { fetchOffers } from '../../redux/couponSales/couponSalesSlice'
import { fetchSiteCoupons } from '../../redux/coupons/couponsSlice'
import { fetchDraws } from '../../redux/rewards/rewardsSlice'
import { couponShopIsOpen, offerStatus } from '../../data/couponSales'
import { drawStatus, formatDrawDate } from '../../data/rewards'

const HOW_TO_BUY = [
  { title: 'Copy the code', note: 'It opens the payment page.' },
  { title: 'Send the money', note: 'By any method we list.' },
  { title: 'Upload your receipt', note: 'A screenshot or photo.' },
  { title: 'Use your coupon', note: 'We check it, then send your code.' },
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

  return (
    <>
      <Head>
        <title>Coupons</title>
        <meta name="description" content="Buy a coupon or use a free code, and save on your groceries." />
      </Head>

      <div className="my-orders">
        <section className="coupon-hero">
          <div className="coupon-hero__head">
            <div>
              <h1>Save more on every basket</h1>
              <p>Buy a coupon or use a free code. Every coupon you buy gets its own code that works once.</p>
            </div>
            <Link href="/coupons/mine" className="shop-btn shop-btn--ghost">My coupons</Link>
          </div>
          {listed.length > 0 && (
            <ol className="how-buy">
              {HOW_TO_BUY.map(({ title, note }, i) => (
                <li key={title}>
                  <span>{i + 1}</span>
                  <div>
                    <strong>{title}</strong>
                    <small>{note}</small>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {!settingsLoaded || !offersLoaded ? (
          <div className="my-order my-order--skeleton" aria-busy="true" aria-label="Loading coupons" />
        ) : !listed.length && !free.length ? (
          <div className="my-orders__empty">
            <TicketPercent size={36} />
            <h2>No coupons right now</h2>
            <p>Check back soon, or see this week's deals.</p>
            <Link href="/deals" className="shop-btn">See deals</Link>
          </div>
        ) : (
          <>
            {listed.length > 0 && (
              <section className="coupon-group">
                <header>
                  <h2>Coupons to buy</h2>
                  <p>Copy a code to start buying.</p>
                </header>
                <div className={ticketGridClass(listed.length)}>
                  {listed.map((offer) => <OfferTicket key={offer.id} offer={offer} />)}
                </div>
              </section>
            )}

            {free.length > 0 && (
              <section className="coupon-group">
                <header>
                  <h2>Free codes</h2>
                  <p>Nothing to pay. Copy one and use it in your basket.</p>
                </header>
                <div className={ticketGridClass(free.length)}>
                  {free.map((coupon) => <FreeTicket key={coupon.code} coupon={coupon} />)}
                </div>
              </section>
            )}
          </>
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
