import React, { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import ProductView from './ProductView'
import Button from './Button'
import { remove } from '../redux/product-modal/productModalSlice'

const ProductViewModal = () => {
  const productSlug = useSelector((state) => state.productModal.value)
  const products = useSelector((state) => state.products.items)
  const dispatch = useDispatch()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(false)
  const modalRef = useRef(null)

  // Fetch product from Redux products slice
  useEffect(() => {
    if (!productSlug) return
    if (!products || products.length === 0) return

    setLoading(true)
    const foundProduct = products.find(p => p.slug === productSlug)
    setProduct(foundProduct || null)
    setLoading(false)
  }, [productSlug, products])

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') dispatch(remove())
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [dispatch])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        dispatch(remove())
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dispatch])

  // Only render modal if productSlug exists
  if (!productSlug) return null

  return (
    <div className="product-view__modal active">
      <div className="product-view__modal__content" ref={modalRef}>
        {loading && <p>Loading product...</p>}
        {!loading && product && <ProductView product={product} />}
        {!loading && product === null && <p>Product not found!</p>}

        <div className="product-view__modal__content__close">
          <Button size="sm" onClick={() => dispatch(remove())}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProductViewModal
