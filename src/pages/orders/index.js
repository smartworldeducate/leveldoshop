import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector } from 'react-redux'
import {
  AlertTriangle,
  Ban,
  Check,
  ClipboardList,
  Clock,
  MessageCircle,
  PackageCheck,
  PackageOpen,
  Home,
  Truck,
  ShieldCheck,
  ThumbsUp,
  Undo2,
  Wallet,
} from 'lucide-react'

import { ItemThumb } from '../../components/ReturnBits'
import { useAuth } from '../../context/AuthContext'
import { fetchCustomerOrders } from '../../lib/customerOrders'
import { formatDate, formatDateTime, isCompleted, orderTotal, orderUnits } from '../../lib/analytics'
import { formatMoney } from '../../data/grocery'
import {
  RETURN_STATUS,
  RETURN_STEPS,
  customerReturnBlock,
  isOpenReturn,
  orderRefunded,
  reasonLabel,
  returnDeadline,
  returnValue,
  returnableQty,
  returnsOf,
  shortOrderId,
} from '../../data/returns'
import {
  FULFILMENT_STEPS,
  ISSUE_TYPES,
  STEP_INFO,
  isCancelled,
  openIssue,
  shortByLine,
  shortValue,
  stageOf,
} from '../../data/fulfilment'
import { latestEvent } from '../../data/notifications'

const STEP_ICONS = { requested: Clock, approved: ThumbsUp, received: PackageCheck, refunded: Wallet }
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

const HOW_IT_WORKS = [
  { icon: ClipboardList, title: 'Tell us what went wrong', body: 'Choose the items and a reason from your order.' },
  { icon: ThumbsUp, title: 'We review your request', body: "You'll see the decision here on this page." },
  { icon: PackageCheck, title: 'We get the items back', body: 'We contact you to arrange this and check them.' },
  { icon: Wallet, title: 'You get your refund', body: 'We pay you back and mark it as refunded here.' },
]

/** Where a return has got to, in words a shopper can follow. */
function ReturnTracker({ ret }) {
  const rejected = ret.status === 'rejected'
  const reached = RETURN_STEPS.indexOf(ret.status)
  const rejection = rejected ? [...(ret.history || [])].reverse().find((h) => h.status === 'rejected') : null
  const units = ret.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <section className={`return-tracker${rejected ? ' return-tracker--rejected' : ''}`}>
      <header className="return-tracker__head">
        <div>
          <h3>{RETURN_STATUS[ret.status]?.customer}</h3>
          <p>
            {plural(units, 'item')} · {reasonLabel(ret.reason)} · requested {formatDate(ret.createdAt)}
          </p>
        </div>
        <strong>{formatMoney(ret.refund ? ret.refund.amount : returnValue(ret))}</strong>
      </header>

      {rejected ? (
        rejection?.note && <p className="return-tracker__note">“{rejection.note}”</p>
      ) : (
        <ol className="return-tracker__steps">
          {RETURN_STEPS.map((step, i) => {
            const Icon = STEP_ICONS[step]
            const state = i < reached || ret.status === 'refunded' ? 'done' : i === reached ? 'current' : 'todo'
            return (
              <li key={step} className={`return-step return-step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                <span className="return-step__dot">
                  {state === 'done' ? <Check size={15} strokeWidth={3} /> : <Icon size={15} />}
                </span>
                <span className="return-step__label">{RETURN_STATUS[step].label}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

const DELIVERY_ICONS = { placed: ClipboardList, confirmed: ThumbsUp, packed: PackageCheck, on_the_way: Truck, delivered: Home }

/** How far the order has got. The step it's stuck or stopped on turns red. */
function DeliveryTracker({ order }) {
  const stage = stageOf(order)
  const reached = FULFILMENT_STEPS.indexOf(stage)
  const closed = stage === 'delivered'
  const issue = openIssue(order)
  const cancelled = isCancelled(order)
  const stuck = issue?.step || (cancelled ? stage : null)
  const updatedAt = latestEvent(order)?.at

  const message = cancelled
    ? `This order was cancelled at the ${STEP_INFO[stage].label} step, so you won't be charged. Contact us if you have any questions.`
    : issue
      ? ISSUE_TYPES[issue.type]?.customer
      : STEP_INFO[stage].customer

  return (
    <section className={`return-tracker${stuck ? ' return-tracker--problem' : ''}`}>
      <header className="return-tracker__head">
        <div>
          <h3>{message}</h3>
          {updatedAt && <p>Updated {formatDateTime(updatedAt)}</p>}
        </div>
      </header>
      <ol className="return-tracker__steps return-tracker__steps--five">
        {FULFILMENT_STEPS.map((step, i) => {
          const Icon = DELIVERY_ICONS[step]
          const failed = stuck === step
          const state = failed ? 'problem' : i < reached || closed ? 'done' : i === reached ? 'current' : 'todo'
          return (
            <li key={step} className={`return-step return-step--${state}`} aria-current={state === 'current' || failed ? 'step' : undefined}>
              <span className="return-step__dot">
                {failed ? (cancelled ? <Ban size={15} /> : <AlertTriangle size={15} />) : state === 'done' ? <Check size={15} strokeWidth={3} /> : <Icon size={15} />}
              </span>
              <span className="return-step__label">{STEP_INFO[step].label}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function OrderCard({ order, settings }) {
  const completed = isCompleted(order)
  const cancelled = isCancelled(order)
  const problem = Boolean(openIssue(order))
  const short = shortByLine(order)
  const block = customerReturnBlock(order, settings)
  const deadline = returnDeadline(order, settings.windowDays)
  const refunded = orderRefunded(order)
  const hasReturnable = (order.cartItems || []).some((_, line) => returnableQty(order, line) > 0)

  return (
    <article className="my-order">
      <header className="my-order__head">
        <div>
          <span className="my-order__id">Order {shortOrderId(order.id)}</span>
          <span className="my-order__date">{formatDateTime(order.createdAt)}</span>
        </div>
        {cancelled ? (
          <span className="my-order__status my-order__status--cancelled"><Ban size={14} /> Cancelled</span>
        ) : problem ? (
          <span className="my-order__status my-order__status--problem"><AlertTriangle size={14} /> Needs attention</span>
        ) : (
          <span className={`my-order__status my-order__status--${completed ? 'done' : 'pending'}`}>
            {completed ? <Check size={14} strokeWidth={3} /> : <Clock size={14} />}
            {completed ? 'Delivered' : STEP_INFO[stageOf(order)].label}
          </span>
        )}
      </header>

      <ul className="my-order__items">
        {(order.cartItems || []).map((item, i) => (
          <li key={`${item.productId || item.title}-${i}`}>
            <ItemThumb src={item.images?.[0]} />
            <div>
              <p>{item.title}</p>
              <span>{item.quantity} × {formatMoney(item.price)}</span>
              {short[i] > 0 && (
                <em className="my-order__short">{short[i]} couldn't be delivered. You won't pay for {short[i] === 1 ? 'it' : 'them'}.</em>
              )}
            </div>
            <strong>{formatMoney((Number(item.quantity) || 0) * (Number(item.price) || 0))}</strong>
          </li>
        ))}
      </ul>

      <DeliveryTracker order={order} />

      {returnsOf(order).map((ret) => <ReturnTracker key={ret.id} ret={ret} />)}

      <footer className="my-order__foot">
        <div className="my-order__total">
          <span>{plural(orderUnits(order), 'item')} · Total</span>
          <strong>{formatMoney(orderTotal(order))}</strong>
          {order.discount > 0 && <em>{formatMoney(order.discount)} saved with {order.coupon?.code}</em>}
          {shortValue(order) > 0 && <em>{formatMoney(shortValue(order))} not charged</em>}
          {refunded > 0 && <em>{formatMoney(refunded)} refunded</em>}
        </div>

        {completed && hasReturnable && (
          block ? (
            <p className="my-order__hint">
              {block === 'expired' ? 'The return window has closed.' : 'Online returns are unavailable.'}{' '}
              <Link href="/contact">Contact us</Link> if something is wrong.
            </p>
          ) : (
            <div className="my-order__action">
              {deadline && <span>Return by {formatDateTime(deadline)}</span>}
              <Link className="shop-btn" href={`/orders/${order.id}/return`}>
                <Undo2 size={16} /> Return items
              </Link>
            </div>
          )
        )}
      </footer>
    </article>
  )
}

export default function MyOrders() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const settings = useSelector((s) => s.settings.values.returns)

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?next=/orders')
      return
    }
    let live = true
    setLoading(true)
    setFailed(false)
    fetchCustomerOrders(user)
      .then((rows) => live && setOrders(rows))
      .catch(() => live && setFailed(true))
      .finally(() => live && setLoading(false))
    return () => { live = false }
  }, [user, authLoading, router])

  const openReturns = orders.flatMap(returnsOf).filter(isOpenReturn).length
  const firstName = (user?.displayName || '').split(' ')[0]
  const windowLabel = settings.windowDays === 1 ? '24 hours' : `${settings.windowDays} days`

  return (
    <>
      <Head>
        <title>My orders</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="my-orders">
        <section className="my-orders__hero">
          <div>
            <h1>{firstName ? `${firstName}'s orders` : 'My orders'}</h1>
            <p>Track your deliveries and return anything that isn't right.</p>
          </div>
          <dl>
            <div><dt>Orders</dt><dd>{orders.length}</dd></div>
            <div><dt>Open returns</dt><dd>{openReturns}</dd></div>
          </dl>
        </section>

        <div className="my-orders__layout">
          <div className="my-orders__list">
            {authLoading || loading ? (
              <div className="my-orders__list" aria-busy="true" aria-label="Loading your orders">
                {[0, 1].map((i) => <div key={i} className="my-order my-order--skeleton" />)}
              </div>
            ) : failed ? (
              <div className="my-orders__empty">
                <PackageOpen size={36} />
                <h2>We couldn't load your orders</h2>
                <p>Check your connection and try again, or contact us if it keeps happening.</p>
                <button type="button" className="shop-btn" onClick={() => router.reload()}>Try again</button>
              </div>
            ) : orders.length === 0 ? (
              <div className="my-orders__empty">
                <PackageOpen size={36} />
                <h2>No orders yet</h2>
                <p>Orders placed with {user?.email} will show up here.</p>
                <Link href="/catalog" className="shop-btn">Start shopping</Link>
              </div>
            ) : (
              orders.map((order) => <OrderCard key={order.id} order={order} settings={settings} />)
            )}
          </div>

          <aside className="my-orders__side">
            <section className="side-card">
              <h2>How returns work</h2>
              <ol className="how-returns">
                {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
                  <li key={title}>
                    <span><Icon size={17} /></span>
                    <div>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="side-card">
              <h2><ShieldCheck size={18} /> Our promise</h2>
              <p>
                Request a return within {windowLabel} of delivery.{' '}
                <Link href="/policy?tab=freshness">Read our freshness promise</Link>
              </p>
            </section>

            <section className="side-card">
              <h2><MessageCircle size={18} /> Need help?</h2>
              <p>
                Something else wrong with an order? <Link href="/contact">Contact us</Link> and we'll sort it out.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </>
  )
}
