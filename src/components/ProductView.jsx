import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import Image from 'next/image'

import { addItem } from '../redux/shopping-cart/cartItemsSlide'
import { remove } from '../redux/product-modal/productModalSlice'

import Button from './Button'
import {
  STORAGE_TYPES,
  categoryLabel,
  discountPercent,
  expiryState,
  formatMoney,
  isSellable,
  packLabel,
  stockState,
  unitPrice,
} from '../data/grocery'

const FALLBACK = {
  title: '',
  price: 0,
  images: ['/placeholder.png'],
  categorySlug: '',
  slug: '',
  description: '',
  unit: 'pc',
  packSize: 1,
  stock: 0,
}

const ProductView = ({ product: propProduct, isModal = false }) => {
  const dispatch = useDispatch()
  const router = useRouter()
  const categories = useSelector((state) => state.categories.items)

  const product = propProduct || FALLBACK
  const images = product.images?.length ? product.images : FALLBACK.images

  const [previewImg, setPreviewImg] = useState(images[0])
  const [descriptionExpand, setDescriptionExpand] = useState(false)
  const [quantity, setQuantity] = useState(1)

  const stock = stockState(product.stock)
  const expiry = expiryState(product.expiry)
  const off = discountPercent(product)
  const perUnit = unitPrice(product)
  const sellable = isSellable(product)
  const storage = STORAGE_TYPES.find((s) => s.value === product.storage)
  // Roughly the height the collapsed panel shows; below it, nothing is hidden.
  const isLongDescription =
    String(product.description || '').replace(/<[^>]*>/g, '').length > 320
  // Never let the basket promise more than the shelf holds.
  const maxQuantity = Math.max(1, Number(product.stock) || 1)

  useEffect(() => {
    setPreviewImg(images[0])
    setQuantity(1)
  }, [product]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateQuantity = (type) =>
    setQuantity((prev) =>
      type === 'plus' ? Math.min(maxQuantity, prev + 1) : Math.max(1, prev - 1)
    )

  const addToCart = () => {
    if (!sellable) return false
    dispatch(addItem({ slug: product.slug, price: Number(product.price), quantity }))
    return true
  }

  const goToCart = () => {
    if (!addToCart()) return
    dispatch(remove())
    router.push('/cart')
  }

  return (
    <div className="product">
      {/* Breadcrumbs — only on the real product page, not inside the modal */}
      {!isModal && (
        <nav className="product__crumbs">
          <Link href="/">Home</Link>
          <i className="bx bx-chevron-right"></i>
          <Link href="/catalog">Shop</Link>
          {product.categorySlug && (
            <>
              <i className="bx bx-chevron-right"></i>
              <Link href={`/catalog?category=${product.categorySlug}`}>
                {categoryLabel(categories, product.categorySlug)}
              </Link>
            </>
          )}
        </nav>
      )}

      {/* Images */}
      <div className="product__images">
        <div className="product__images__list">
          {images.map((img, idx) => (
            <div
              key={idx}
              className={`product__images__list__item ${previewImg === img ? 'active' : ''}`}
              onClick={() => setPreviewImg(img)}
            >
              <Image src={img} alt={product.title} width={100} height={100} />
            </div>
          ))}
        </div>

        <div className="product__images__main">
          <Image src={previewImg} alt={product.title} width={500} height={500} />
        </div>

        {product.description && (
          <div className={`product-description ${descriptionExpand ? 'expand' : ''}`}>
            <div className="product-description__title">About this product</div>
            <div
              className="product-description__content"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
            {/* Only offer the toggle when there is actually more to reveal. */}
            {isLongDescription && (
              <div className="product-description__toggle">
                <Button size="sm" onClick={() => setDescriptionExpand(!descriptionExpand)}>
                  {descriptionExpand ? 'Collapse' : 'See more'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="product__info">
        <div className="product__info__tags">
          {product.brand && <span className="tag">{product.brand}</span>}
          {product.categorySlug && (
            <span className="tag">{categoryLabel(categories, product.categorySlug)}</span>
          )}
          {product.organic && <span className="tag tag--fresh">Organic</span>}
          {off && <span className="tag tag--sale">-{off}%</span>}
        </div>

        <h1 className="product__info__title">{product.title}</h1>

        <div className="product__info__item">
          <span className="product__info__item__price">{formatMoney(product.price)}</span>
          {off && (
            <span className="product__info__item__price--old">{formatMoney(product.comparePrice)}</span>
          )}
          <span className="product__info__item__unit">
            per {packLabel(product)}
            {perUnit ? ` · ${perUnit}` : ''}
          </span>
        </div>

        {/* Grocery facts */}
        <div className="product__facts">
          <div className="product__facts__row">
            <span>Availability</span>
            <strong className={`product__facts__state is-${stock.tone}`}>{stock.label}</strong>
          </div>
          {expiry && (
            <div className="product__facts__row">
              <span>Best before</span>
              <strong className={`product__facts__state is-${expiry.tone}`}>
                {product.expiry} · {expiry.label}
              </strong>
            </div>
          )}
          {storage && (
            <div className="product__facts__row">
              <span>Storage</span>
              <strong>{storage.label}</strong>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="product__info__item">
          <div className="product__info__item__title">Quantity</div>
          <div className="product__info__item__quantity">
            <div className="product__info__item__quantity__btn" onClick={() => updateQuantity('minus')}>
              <i className="bx bx-minus"></i>
            </div>
            <div className="product__info__item__quantity__input">{quantity}</div>
            <div className="product__info__item__quantity__btn" onClick={() => updateQuantity('plus')}>
              <i className="bx bx-plus"></i>
            </div>
          </div>
          <div className="product__info__item__subtotal">
            Subtotal <strong>{formatMoney((Number(product.price) || 0) * quantity)}</strong>
          </div>
        </div>

        {/* Buttons */}
        <div className="product__info__item product__info__buttons">
          <Button size="sm" onClick={addToCart} disabled={!sellable}>
            {sellable ? 'Add to cart' : 'Sold out'}
          </Button>
          <Button size="sm" onClick={goToCart} disabled={!sellable}>
            Buy now
          </Button>
        </div>

        {off && (
          <p className="product__saving">
            You save {formatMoney((Number(product.comparePrice) || 0) - (Number(product.price) || 0))}{' '}
            on this pack
          </p>
        )}

        {/* What every basket comes with — the same promises as the home page */}
        <ul className="product__promises">
          <li>
            <i className="bx bx-cycling"></i>
            <span>
              <strong>Same-day delivery</strong>
              <small>Order before 4pm</small>
            </span>
          </li>
          <li>
            <i className="bx bx-check-shield"></i>
            <span>
              <strong>Freshness promise</strong>
              <small>Not fresh? We replace it</small>
            </span>
          </li>
          <li>
            <i className="bx bx-wallet"></i>
            <span>
              <strong>Cash on delivery</strong>
              <small>Pay when it arrives</small>
            </span>
          </li>
        </ul>
      </div>

      {/* Phone buy bar — the real one scrolls away above the fold on mobile */}
      {!isModal && (
        <div className="product__buybar">
          <div className="product__buybar__price">
            <strong>{formatMoney((Number(product.price) || 0) * quantity)}</strong>
            <small>
              {quantity} × {packLabel(product)}
            </small>
          </div>
          <button
            type="button"
            className="product__buybar__btn"
            onClick={addToCart}
            disabled={!sellable}
          >
            <i className="bx bx-cart"></i>
            {sellable ? 'Add to cart' : 'Sold out'}
          </button>
        </div>
      )}
    </div>
  )
}

ProductView.propTypes = {
  product: PropTypes.object.isRequired,
}

export default ProductView
