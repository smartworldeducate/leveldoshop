import React, { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'

import { requestPaypalPurchase } from '../redux/couponSales/couponSalesSlice'
import { PAYPAL_CURRENCY } from '../data/paypal'

let sdk = null

const loadSdk = () => {
  if (window.paypal) return Promise.resolve(window.paypal)
  if (sdk) return sdk
  sdk = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=${PAYPAL_CURRENCY}&intent=capture&components=buttons`
    script.onload = () => resolve(window.paypal)
    script.onerror = () => {
      sdk = null
      reject(new Error('sdk'))
    }
    document.head.appendChild(script)
  })
  return sdk
}

const post = async (path, user, body) => {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, data: await res.json().catch(() => ({})) }
}

/**
 * PayPal's own buttons. `validate` runs first, so nobody pays with their details
 * missing. The purchase is saved before the money is taken: see data/paypal.js.
 */
export default function PayPalButton({ offer, token, user, buyer, paidBy, validate, onPaid }) {
  const dispatch = useDispatch()
  const holder = useRef(null)
  const latest = useRef({})
  latest.current = { buyer, paidBy, validate, onPaid }
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    let buttons
    loadSdk()
      .then((paypal) => {
        if (!live || !holder.current) return
        buttons = paypal.Buttons({
          style: { layout: 'vertical', shape: 'pill', label: 'pay' },
          onClick: (_, actions) => {
            setError('')
            return latest.current.validate() ? actions.resolve() : actions.reject()
          },
          createOrder: async () => {
            const { ok, data } = await post('/api/paypal/create-order', user, { offerId: offer.id, token })
            if (!ok) throw new Error(data.reason)
            return data.id
          },
          onApprove: async (data, actions) => {
            const orderId = data.orderID
            await dispatch(
              requestPaypalPurchase({ offer, orderId, token, buyer: latest.current.buyer(), paymentMethod: latest.current.paidBy })
            ).unwrap()

            const capture = await post('/api/paypal/capture-order', user, { orderId })
            if (capture.data.reason === 'declined') return actions.restart()
            if (!capture.ok || capture.data.status !== 'COMPLETED') throw new Error('capture')
            latest.current.onPaid(orderId)
            return undefined
          },
          onError: () => {
            setError(`The payment didn't finish. If money left your account, contact us and give your reference ${token}.`)
          },
        })
        return buttons.render(holder.current).then(() => live && setState('ready'))
      })
      .catch(() => live && setState('failed'))

    return () => {
      live = false
      buttons?.close?.().catch?.(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer.id, token, user])

  return (
    <div className="paypal-box">
      {state === 'loading' && <p aria-busy="true">Loading PayPal…</p>}
      {state === 'failed' && <p className="checkout-pin is-error">PayPal couldn't load. Please check your connection, or choose another payment method.</p>}
      <div ref={holder} />
      {error && <p className="checkout-pin is-error" role="alert">{error}</p>}
    </div>
  )
}
