import { useRouter } from 'next/router'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

export const SAVED_COUPON_KEY = 'savedCouponCode'

/**
 * Copies a code and moves on to using it: the basket with it applied, or the
 * shop if the basket is empty. In that case the basket remembers it for later.
 */
export default function useApplyCoupon() {
  const router = useRouter()
  const basket = useSelector((state) => state.cartItems.value)

  return async (code) => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // Not fatal: the basket applies it either way.
    }
    if (basket.length) {
      toast.success(`${code} copied`)
      router.push(`/cart?coupon=${encodeURIComponent(code)}`)
      return
    }
    try {
      sessionStorage.setItem(SAVED_COUPON_KEY, code)
    } catch {
      // Private window: the code is still on the clipboard.
    }
    toast.success(`${code} saved. Add some items and it will be in your basket.`)
    router.push('/catalog')
  }
}
