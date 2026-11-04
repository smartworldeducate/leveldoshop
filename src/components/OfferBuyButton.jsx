import React, { useState } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { Copy } from 'lucide-react'

import { generateToken } from '../data/couponSales'
import { rememberToken } from '../lib/buyToken'

/**
 * The code a customer copies to start buying a coupon. Copying moves straight on
 * to the payment page. It only identifies the purchase: the code that gives the
 * discount is issued once the payment is confirmed.
 */
export default function OfferBuyButton({ offerId }) {
  const router = useRouter()
  const [token] = useState(generateToken)

  const copyAndContinue = async () => {
    try {
      await navigator.clipboard.writeText(token)
      toast.success('Code copied. Now complete your payment.')
    } catch {
      // Not fatal: the payment page shows the code again.
    }
    // Never in the address: a link can't be shared, guessed or edited.
    rememberToken(offerId, token)
    router.push(`/coupons/${offerId}`)
  }

  return (
    <button type="button" className="offer-copy" aria-label={`Copy code ${token} and buy`} onClick={copyAndContinue}>
      <span>{token}</span>
      <small>Copy to buy <Copy size={14} /></small>
    </button>
  )
}
