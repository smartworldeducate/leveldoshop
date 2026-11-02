import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Link from 'next/link'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import {
  Banknote,
  CheckCircle2,
  Crosshair,
  MapPin,
  MessageCircle,
  PackageCheck,
  ShoppingBasket,
  Truck,
} from 'lucide-react'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'

import CartItem from '../components/CartItem'
import { useAuth } from '../context/AuthContext'
import { clearCart } from '../redux/shopping-cart/cartItemsSlide'
import { formatMoney } from '../data/grocery'
import { shortOrderId } from '../data/returns'
import { whatsappNumber } from '../data/notifications'
import { auth, db } from '../lib/firebaseClient'

// ✅ Disable SSR for Leaflet map
const LocationPicker = dynamic(
  () => import('../components/LocationPicker'),
  { ssr: false, loading: () => <div className="checkout-map-loading">Loading map…</div> }
)

const FIELDS = [
  { name: 'name', label: 'Full name', autoComplete: 'name' },
  { name: 'phone', label: 'WhatsApp number', type: 'tel', autoComplete: 'tel', placeholder: '03001234567', hint: "We'll send your delivery updates here." },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', hint: 'Use this email to see your order under My orders.' },
  { name: 'city', label: 'City', autoComplete: 'address-level2' },
  { name: 'address', label: 'Street address', autoComplete: 'street-address', wide: true },
]

function Confirmation({ orderId, signedIn, email }) {
  return (
    <div className="order-placed">
      <span className="order-placed__icon"><CheckCircle2 size={44} /></span>
      <h1>Thank you, your order is placed!</h1>
      <p className="order-placed__ref">Order {shortOrderId(orderId)}</p>

      <ol className="order-placed__next">
        <li>
          <span><PackageCheck size={20} /></span>
          <div>
            <h2>We prepare your order</h2>
            <p>We check it, pick your items and pack them.</p>
          </div>
        </li>
        <li>
          <span><MessageCircle size={20} /></span>
          <div>
            <h2>We keep you updated</h2>
            <p>We'll message you on WhatsApp as your order moves along.</p>
          </div>
        </li>
        <li>
          <span><Banknote size={20} /></span>
          <div>
            <h2>Pay when it arrives</h2>
            <p>Have your payment ready for the driver.</p>
          </div>
        </li>
      </ol>

      <div className="order-placed__actions">
        <Link href={signedIn ? '/orders' : '/login?next=/orders'} className="shop-btn">
          {signedIn ? 'Track my order' : 'Sign in to track your order'}
        </Link>
        <Link href="/catalog" className="shop-btn shop-btn--ghost">Continue shopping</Link>
      </div>
      {!signedIn && <small>Sign in with {email} to see this order.</small>}
    </div>
  )
}

export default function Cart() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const cartItems = useSelector((state) => state.cartItems.value)

  const [products, setProducts] = useState(null)
  const [orderData, setOrderData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    location: null,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [placed, setPlaced] = useState(null)
  const formRef = useRef(null)

  // Fetch full product info
  useEffect(() => {
    getDocs(collection(db, 'products'))
      .then((snapshot) => setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))))
      .catch((error) => {
        console.error('Error fetching products:', error)
        setProducts([])
      })
  }, [])

  // Save signed-in shoppers some typing, without overwriting what they've entered.
  useEffect(() => {
    if (!user) return
    setOrderData((prev) => ({
      ...prev,
      name: prev.name || user.displayName || '',
      email: prev.email || user.email || '',
    }))
  }, [user])

  const cartProducts = useMemo(
    () => cartItems.map((item) => ({ ...item, product: products?.find((p) => p.slug === item.slug) })),
    [cartItems, products]
  )

  const totalProducts = cartItems.reduce((total, item) => total + Number(item.quantity), 0)
  const totalPrice = cartItems.reduce((total, item) => total + Number(item.quantity) * Number(item.price), 0)

  /** Why a line can't be ordered as it stands, or undefined. */
  const lineProblem = ({ product, quantity }) => {
    if (!products) return undefined
    if (!product) return 'Please remove this item to continue.'
    const stock = Number(product.stock) || 0
    if (stock <= 0) return 'Sold out. Please remove this item to continue.'
    if (quantity > stock) return `Only ${stock} left. Please reduce the quantity.`
    return undefined
  }

  const hasBasketProblem = cartProducts.some(lineProblem)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setOrderData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const setLocation = (location) => {
    setOrderData((prev) => ({ ...prev, location }))
    setErrors((prev) => ({ ...prev, location: '' }))
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Your browser cannot share its location')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude })
        setLocating(false)
      },
      () => {
        toast.error('We could not get your location. Tap the map instead.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const validate = () => {
    const newErrors = {}

    if (!orderData.name.trim()) newErrors.name = 'Enter your name'
    if (!whatsappNumber(orderData.phone)) newErrors.phone = 'Enter a valid phone number'
    if (!orderData.email.trim()) newErrors.email = 'Enter your email'
    else if (!/\S+@\S+\.\S+/.test(orderData.email)) newErrors.email = 'Enter a valid email'
    if (!orderData.city.trim()) newErrors.city = 'Enter your city'
    if (!orderData.address.trim()) newErrors.address = 'Enter your street address'
    if (!orderData.location) newErrors.location = 'Tap the map to pin your delivery location'

    setErrors(newErrors)
    return newErrors
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    if (hasBasketProblem) return toast.error('Please fix the items marked in your basket')

    const invalid = Object.keys(validate())
    if (invalid.length) {
      const field = formRef.current?.querySelector(`[name="${invalid[0]}"]`) || document.getElementById('checkout-location')
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field?.focus?.({ preventScroll: true })
      return undefined
    }

    setLoading(true)
    try {
      const ref = await addDoc(collection(db, 'order'), {
        user: orderData,
        userId: auth.currentUser?.uid || null, // lets My orders find it whatever email was typed
        location: orderData.location, // ✅ saved
        cartItems: cartProducts.map((item) => ({
          productId: item.product.id,
          title: item.product.title,
          images: item.product.images || [],
          price: Number(item.price),
          quantity: Number(item.quantity),
        })),
        totalPrice,
        createdAt: serverTimestamp(),
      })
      setPlaced({ id: ref.id, email: orderData.email })
      dispatch(clearCart())
      window.scrollTo({ top: 0 })
    } catch (error) {
      console.error('Order error:', error)
      toast.error('We could not place your order. Please try again.')
    }
    setLoading(false)
  }

  const head = (
    <Head>
      <title>Your basket</title>
      <meta name="description" content="Review your basket and place your order" />
    </Head>
  )

  if (placed) {
    return (
      <>
        {head}
        <Confirmation orderId={placed.id} signedIn={Boolean(user)} email={placed.email} />
      </>
    )
  }

  if (!cartItems.length) {
    return (
      <>
        {head}
        <div className="basket-empty">
          <span><ShoppingBasket size={40} /></span>
          <h1>Your basket is empty</h1>
          <p>Fresh groceries are just a few taps away.</p>
          <Link href="/catalog" className="shop-btn">Start shopping</Link>
        </div>
      </>
    )
  }

  return (
    <>
      {head}
      <form className="checkout" ref={formRef} onSubmit={handlePlaceOrder} noValidate>
        <header className="checkout__head">
          <h1>Your basket</h1>
          <p>{totalProducts} item{totalProducts === 1 ? '' : 's'}, ready when you are</p>
        </header>

        <div className="checkout__layout">
          <div className="checkout__main">
            <section className="checkout-card">
              <h2><span>1</span> Review your items</h2>
              {products ? (
                <ul className="basket-lines">
                  {cartProducts.map((item) => (
                    <CartItem key={item.slug} item={item} problem={lineProblem(item)} />
                  ))}
                </ul>
              ) : (
                <div className="checkout-skeleton" aria-busy="true" aria-label="Loading your basket" />
              )}
              <Link href="/catalog" className="checkout-card__link">+ Add more items</Link>
            </section>

            <section className="checkout-card">
              <h2><span>2</span> Delivery details</h2>
              <div className="checkout-fields">
                {FIELDS.map((f) => (
                  <div key={f.name} className={`checkout-field${f.wide ? ' checkout-field--wide' : ''}`}>
                    <label htmlFor={`checkout-${f.name}`}>{f.label}</label>
                    <input
                      id={`checkout-${f.name}`}
                      name={f.name}
                      type={f.type || 'text'}
                      autoComplete={f.autoComplete}
                      placeholder={f.placeholder}
                      value={orderData[f.name]}
                      onChange={handleInputChange}
                      aria-invalid={Boolean(errors[f.name])}
                      aria-describedby={`checkout-${f.name}-note`}
                    />
                    <small id={`checkout-${f.name}-note`} className={errors[f.name] ? 'is-error' : ''}>
                      {errors[f.name] || f.hint}
                    </small>
                  </div>
                ))}
              </div>
            </section>

            <section className="checkout-card">
              <div className="checkout-card__row">
                <h2><span>3</span> Pin your location</h2>
                <button type="button" className="checkout-locate" onClick={useMyLocation} disabled={locating}>
                  <Crosshair size={16} /> {locating ? 'Finding you…' : 'Use my location'}
                </button>
              </div>
              <p className="checkout-card__note">Tap the map where the driver should bring your order.</p>
              <div id="checkout-location" tabIndex={-1} className={`checkout-map${errors.location ? ' checkout-map--error' : ''}`}>
                <LocationPicker value={orderData.location} onChange={setLocation} />
              </div>
              {errors.location ? (
                <small className="checkout-pin is-error">{errors.location}</small>
              ) : (
                orderData.location && (
                  <small className="checkout-pin is-set"><MapPin size={14} /> Location pinned</small>
                )
              )}
            </section>
          </div>

          <aside className="checkout__side">
            <section className="checkout-card">
              <h2 className="checkout-summary__title">Order summary</h2>
              <ul className="checkout-summary__lines">
                {cartProducts.map((item) => (
                  <li key={item.slug}>
                    <span>{item.quantity} × {item.product?.title || 'Item'}</span>
                    <strong>{formatMoney(Number(item.quantity) * Number(item.price))}</strong>
                  </li>
                ))}
              </ul>

              <div className="checkout-summary__total">
                <span>Total</span>
                <strong>{formatMoney(totalPrice)}</strong>
              </div>

              <div className="checkout-summary__pay">
                <Banknote size={20} />
                <div>
                  <p>Cash on delivery</p>
                  <span>Pay the driver when your order arrives.</span>
                </div>
              </div>

              <button type="submit" className="shop-btn shop-btn--block" disabled={loading || !products}>
                {loading ? 'Placing your order…' : `Place order · ${formatMoney(totalPrice)}`}
              </button>

              <ul className="checkout-summary__trust">
                <li><Truck size={15} /> Delivery updates on WhatsApp</li>
              </ul>
            </section>
          </aside>
        </div>
      </form>
    </>
  )
}
