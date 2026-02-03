import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Link from 'next/link'
import Head from 'next/head'

import CartItem from '../components/CartItem'
import Button from '../components/Button'
import numberWithCommas from '../utils/numberWithCommas'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebaseClient'

export default function Cart() {
  const dispatch = useDispatch()
  const cartItems = useSelector((state) => state.cartItems.value)

  const [cartProducts, setCartProducts] = useState([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [totalPrice, setTotalPrice] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [orderData, setOrderData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    address: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Fetch full product info from Firebase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRef = collection(db, 'products')
        const snapshot = await getDocs(productsRef)
        const productsArray = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        const cartFullProducts = cartItems.map(item => {
          const product = productsArray.find(p => p.slug === item.slug)
          return { ...item, product }
        })

        setCartProducts(cartFullProducts)
      } catch (error) {
        console.error('Error fetching products from Firebase:', error)
      }
    }

    fetchProducts()
  }, [cartItems])

  // Calculate totals
  useEffect(() => {
    setTotalPrice(
      cartItems.reduce((total, item) => total + Number(item.quantity) * Number(item.price), 0)
    )
    setTotalProducts(cartItems.reduce((total, item) => total + Number(item.quantity), 0))
  }, [cartItems])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setOrderData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' })) // clear error
  }

  const validate = () => {
    const newErrors = {}
    if (!orderData.name.trim()) newErrors.name = 'Name is required'
    if (!orderData.email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(orderData.email)) newErrors.email = 'Email is invalid'
    if (!orderData.phone.trim()) newErrors.phone = 'Phone is required'
    if (!orderData.city.trim()) newErrors.city = 'City is required'
    if (!orderData.address.trim()) newErrors.address = 'Address is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePlaceOrder = async () => {
    if (!validate()) return

    setLoading(true)
    try {
      await addDoc(collection(db, 'order'), {
        user: orderData,
        cartItems: cartProducts.map(item => ({
          productId: item.product?.id,
          title: item.product?.title,
          images: item.product?.images || [], // ✅ include product images
          price: Number(item.price),
          quantity: Number(item.quantity),
        })),
        totalPrice,
        createdAt: serverTimestamp()
      })
      setSuccessMessage('Your order has been placed successfully!')
      setShowModal(false)
      // removed clearCart() since you don't want to clear the cart
    } catch (error) {
      console.error('Error placing order:', error)
      alert('Failed to place order. Please try again.')
    }
    setLoading(false)
  }

  const formFields = ['name', 'email', 'phone', 'city', 'address']

  return (
    <>
      <Head>
        <title>Shop</title>
        <meta name="description" content="Your shopping cart" />
      </Head>

      <div className="cart">
        <div className="cart__info">
          <div className="cart__info__txt">
            <p>You have {totalProducts} items in your cart</p>
            <div className="cart__info__txt__price">
              <span>Total:</span> <span>{numberWithCommas(totalPrice)}</span>
            </div>
          </div>

          <div className="cart__info__btn">
            <Button size="block" onClick={() => setShowModal(true)}>
              Place Order
            </Button>

            <Link href="/catalog" passHref>
              <Button size="block">Continue Shopping</Button>
            </Link>
          </div>
        </div>

        <div className="cart__list">
          {cartProducts.length > 0 ? (
            cartProducts.map((item, index) => <CartItem item={item} key={index} />)
          ) : (
            <p>Your cart is empty.</p>
          )}
        </div>
      </div>

      {/* Modal */}
     {/* Modal */}
{showModal && (
  <div className="cart-modal-overlay" onClick={() => setShowModal(false)}>
    <div className="cart-modal-content" onClick={e => e.stopPropagation()}>
      <h2 className="cart-modal-title">Place Your Order</h2>

      <div className="cart-modal-form">
        {formFields.map(field => (
          <div className="cart-modal-form-group" key={field}>
            <input
              type={field === 'email' ? 'email' : 'text'}
              name={field}
              value={orderData[field]}
              onChange={handleInputChange}
              placeholder=" "
            />
            <label>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
            {errors[field] && <p className="cart-modal-error">{errors[field]}</p>}
          </div>
        ))}
      </div>

      <div className="cart-modal-summary">
        <h3>Cart Summary</h3>
        {cartProducts.map((item, index) => (
          <div key={index} className="cart-modal-summary-item">
            <span>{item.product?.title}</span>
            <span>{item.quantity} x {numberWithCommas(item.price)}</span>
          </div>
        ))}
        <div className="cart-modal-summary-total">
          <strong>Total:</strong> {numberWithCommas(totalPrice)}
        </div>
      </div>

      <div className="cart-modal-actions">
        <Button size="block" onClick={handlePlaceOrder} disabled={loading}>
          {loading ? 'Placing Order...' : 'Confirm Order'}
        </Button>
        <Button size="block" variant="secondary" onClick={() => setShowModal(false)}>
          Cancel
        </Button>
      </div>
    </div>
  </div>
)}

    </>
  )
}
