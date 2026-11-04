import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { ArrowLeft, Minus, PackageOpen, Plus, Send } from 'lucide-react'

import { ItemThumb } from '../../../components/ReturnBits'
import { useAuth } from '../../../context/AuthContext'
import { fetchCustomerOrder } from '../../../lib/customerOrders'
import { createReturn } from '../../../redux/admin/ordersSlice'
import { formatDateTime } from '../../../lib/analytics'
import { formatMoney } from '../../../data/grocery'
import {
  RETURN_REASONS,
  customerReturnBlock,
  returnDeadline,
  returnableQty,
  shortOrderId,
} from '../../../data/returns'
import { unitPaid } from '../../../data/fulfilment'

const BLOCK_MESSAGES = {
  expired: 'The return window for this order has closed.',
  disabled: "Returns can't be requested online right now.",
  unavailable: 'There is nothing left to return on this order.',
}

export default function RequestReturn() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { user, loading: authLoading } = useAuth()
  const settings = useSelector((s) => s.settings.values.returns)
  const { id } = router.query

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selection, setSelection] = useState({})
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (authLoading || !router.isReady) return
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(router.asPath)}`)
      return
    }
    let live = true
    setLoading(true)
    fetchCustomerOrder(id, user)
      .then((row) => live && setOrder(row))
      .catch(() => live && setOrder(null))
      .finally(() => live && setLoading(false))
    return () => { live = false }
  }, [id, user, authLoading, router])

  const block = order ? customerReturnBlock(order, settings) : null

  const lines = (order?.cartItems || [])
    .map((item, line) => ({ item, line, max: returnableQty(order, line) }))
    .filter((row) => row.max > 0)
  const chosen = lines.filter(({ line }) => selection[line] > 0)
  const units = chosen.reduce((sum, { line }) => sum + selection[line], 0)
  const value = chosen.reduce((sum, { item, line }) => sum + selection[line] * unitPaid(item), 0)
  const change = (line, max, next) =>
    setSelection((s) => ({ ...s, [line]: Math.min(max, Math.max(0, next)) }))

  const submit = async () => {
    setSaving(true)
    try {
      await dispatch(
        createReturn({ orderId: order.id, selection, reason, note, source: 'customer', settings })
      ).unwrap()
      toast.success('Return requested. We will review it shortly.')
      router.push('/orders')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Could not send your request')
      setSaving(false)
    }
  }

  const deadline = order ? returnDeadline(order, settings.windowDays) : null
  const missing = units <= 0 ? 'Choose at least one item' : !reason ? 'Choose a reason' : null

  return (
    <>
      <Head>
        <title>Return items</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="my-orders">
        <Link href="/orders" className="back-link"><ArrowLeft size={16} /> Back to my orders</Link>

        <section className="my-orders__hero my-orders__hero--slim">
          <div>
            <h1>Return items</h1>
            <p>
              {order ? `Order ${shortOrderId(order.id)}` : 'Tell us what went wrong and we will put it right.'}
              {order && !block && deadline ? ` · return by ${formatDateTime(deadline)}` : ''}
            </p>
          </div>
        </section>

        {authLoading || loading ? (
          <div className="my-order my-order--skeleton" aria-busy="true" aria-label="Loading your order" />
        ) : !order || block ? (
          <div className="my-orders__empty">
            <PackageOpen size={36} />
            <h2>{order ? BLOCK_MESSAGES[block] : "We couldn't find this order"}</h2>
            <p>If something is wrong with your order, we can still help.</p>
            <Link href="/contact" className="shop-btn">Contact us</Link>
          </div>
        ) : (
          <div className="my-orders__layout">
            <div className="my-orders__list">
              <section className="return-form">
                <h2><span>1</span> What are you returning?</h2>
                <ul className="return-lines">
                  {lines.map(({ item, line, max }) => (
                    <li key={line} className={selection[line] ? 'is-selected' : ''}>
                      <ItemThumb src={item.images?.[0]} />
                      <div>
                        <p>{item.title}</p>
                        <span>{formatMoney(unitPaid(item))} each · {max} can be returned</span>
                      </div>
                      <div className="qty-stepper" role="group" aria-label={`Units of ${item.title} to return`}>
                        <button type="button" aria-label="One less" disabled={!selection[line]} onClick={() => change(line, max, (selection[line] || 0) - 1)}>
                          <Minus size={14} />
                        </button>
                        <span aria-live="polite">{selection[line] || 0}</span>
                        <button type="button" aria-label="One more" disabled={(selection[line] || 0) >= max} onClick={() => change(line, max, (selection[line] || 0) + 1)}>
                          <Plus size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="return-form">
                <h2><span>2</span> Why are you returning them?</h2>
                <div className="return-reasons">
                  {RETURN_REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      aria-pressed={reason === r.value}
                      className={reason === r.value ? 'is-selected' : ''}
                      onClick={() => setReason(r.value)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="return-form">
                <h2><span>3</span> <label htmlFor="return-note">Anything else we should know?</label> <em>Optional</em></h2>
                <textarea id="return-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
              </section>
            </div>

            <aside className="my-orders__side">
              <section className="side-card return-summary">
                <h2>Your return</h2>
                {chosen.length > 0 ? (
                  <ul>
                    {chosen.map(({ item, line }) => (
                      <li key={line}>
                        <span>{selection[line]} × {item.title}</span>
                        <strong>{formatMoney(selection[line] * unitPaid(item))}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Items you choose will appear here.</p>
                )}
                <div className="return-summary__total">
                  <span>Estimated refund</span>
                  <strong>{formatMoney(value)}</strong>
                </div>
                <button type="button" className="shop-btn shop-btn--block" disabled={Boolean(missing) || saving} onClick={submit}>
                  <Send size={16} /> {saving ? 'Sending…' : 'Send request'}
                </button>
                {missing && <small>{missing} to continue</small>}
              </section>
            </aside>
          </div>
        )}
      </div>
    </>
  )
}
