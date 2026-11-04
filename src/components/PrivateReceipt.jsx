import React, { useEffect, useState } from 'react'

import { loadReceipt } from '../redux/couponSales/couponSalesSlice'

/**
 * A payment receipt, read through the security rules, so it only appears for the
 * buyer and staff. "Open full size" makes a temporary address that works in this
 * browser only and can't be shared. Older purchases still have a public link.
 */
export default function PrivateReceipt({ purchase, className = '' }) {
  const [image, setImage] = useState(purchase.screenshot || null)
  const [state, setState] = useState(purchase.screenshot ? 'ready' : 'loading')

  useEffect(() => {
    if (purchase.screenshot) return undefined
    let live = true
    setState('loading')
    loadReceipt(purchase.id)
      .then((data) => {
        if (!live) return
        setImage(data)
        setState(data ? 'ready' : 'none')
      })
      .catch(() => live && setState('error'))
    return () => {
      live = false
    }
  }, [purchase.id, purchase.screenshot])

  const openFull = async () => {
    const blob = await (await fetch(image)).blob()
    window.open(URL.createObjectURL(blob), '_blank', 'noopener')
  }

  return (
    <div className="private-receipt">
      {state === 'loading' && <p aria-busy="true">Loading the receipt…</p>}
      {state === 'none' && <p>No receipt was uploaded.</p>}
      {state === 'error' && <p>Could not load the receipt.</p>}
      {state === 'ready' && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Payment receipt" className={className} />
          <button type="button" onClick={openFull}>Open full size</button>
        </>
      )}
    </div>
  )
}
