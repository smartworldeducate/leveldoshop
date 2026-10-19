import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import Image from 'next/image'

import { addItem } from '../redux/shopping-cart/cartItemsSlide'
import { remove } from '../redux/product-modal/productModalSlice'

import {
  LOW_STOCK_THRESHOLD,
  STORAGE_TYPES,
  aisleIcon,
  categoryAccent,
  categoryLabel,
  discountPercent,
  expiryState,
  formatMoney,
  isSellable,
  packLabel,
  unitPrice,
} from '../data/grocery'
import { DEFAULT_HOME } from '../data/home'

const STORAGE_ICONS = {
  ambient: 'bx bx-package',
  chilled: 'bx bx-fridge',
  frozen: 'bx bx-cloud-snow',
}

/** "16 Aug 2026" — a shopper reads a date, not an ISO string. */
const prettyDate = (value) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Product page body (also rendered, without breadcrumbs, details or the phone
 * buy bar, inside the quick-view modal).
 *
 * Two columns: a gallery card and a sticky buy panel. The buy panel says
 * plainly why something can't be bought instead of showing a stock count next
 * to a disabled button, and the delivery promises are the ones written in the
 * dashboard for the home page, so the two never disagree.
 */
const ProductView = ({ product, isModal = false }) => {
  const dispatch = useDispatch()
  const router = useRouter()
  const categories = useSelector((state) => state.categories.items)
  const { home, contact } = useSelector((state) => state.settings.values)

  const images = (product.images || []).filter(Boolean)
  const [active, setActive] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const stockCount = Number(product.stock) || 0
  const expiry = expiryState(product.expiry)
  const off = discountPercent(product)
  const perUnit = unitPrice(product)
  const sellable = isSellable(product)
  const storage = STORAGE_TYPES.find((s) => s.value === product.storage)
  const aisle = product.categorySlug ? categoryLabel(categories, product.categorySlug) : ''
  const accent = categoryAccent(categories, product.categorySlug)
  const price = Number(product.price) || 0
  const saving = off ? (Number(product.comparePrice) || 0) - price : 0
  // Never let the basket promise more than the shelf holds.
  const maxQuantity = Math.max(1, stockCount)

  const promises = (home?.promises?.length ? home.promises : DEFAULT_HOME.promises)
    .filter((p) => (p.title || '').trim())
    .slice(0, 3)

  useEffect(() => {
    setActive(0)
    setQuantity(1)
    setAdded(false)
  }, [product.slug])

  // One availability line, worded for a shopper rather than a stock-taker.
  const status = !sellable
    ? stockCount <= 0
      ? { tone: 'danger', label: 'Out of stock', note: 'This item is sold out for now — check back soon.' }
      : { tone: 'danger', label: 'Unavailable', note: 'This batch is past its best-before date, so we have taken it off sale.' }
    : stockCount <= LOW_STOCK_THRESHOLD
    ? { tone: 'warning', label: `Only ${stockCount} left`, note: null }
    : { tone: 'success', label: 'In stock', note: null }

  const addToCart = () => {
    if (!sellable) return false
    dispatch(addItem({ slug: product.slug, price, quantity }))
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
    return true
  }

  const buyNow = () => {
    if (!addToCart()) return
    dispatch(remove())
    router.push('/cart')
  }

  const step = (delta) => setQuantity((q) => Math.min(maxQuantity, Math.max(1, q + delta)))

  const specs = [
    product.brand && { label: 'Brand', value: product.brand },
    aisle && { label: 'Aisle', value: aisle, href: `/catalog?category=${product.categorySlug}` },
    { label: 'Pack size', value: packLabel(product) },
    perUnit && { label: 'Unit price', value: perUnit },
    storage && { label: 'Storage', value: storage.label },
    product.expiry && { label: 'Best before', value: prettyDate(product.expiry) },
    { label: 'Organic', value: product.organic ? 'Yes' : 'No' },
  ].filter(Boolean)

  const hasDescription = String(product.description || '').replace(/<[^>]*>/g, '').trim().length > 0

  return (
    <div className={`pdp ${isModal ? 'pdp--modal' : ''}`}>
      {!isModal && (
        <nav className="pdp__crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <i className="bx bx-chevron-right" aria-hidden="true"></i>
          <Link href="/catalog">Shop</Link>
          {aisle && (
            <>
              <i className="bx bx-chevron-right" aria-hidden="true"></i>
              <Link href={`/catalog?category=${product.categorySlug}`}>{aisle}</Link>
            </>
          )}
          <i className="bx bx-chevron-right" aria-hidden="true"></i>
          <span aria-current="page">{product.title}</span>
        </nav>
      )}

      <div className="pdp__main">
        {/* ---------- gallery ---------- */}
        <div className="pdp__gallery">
          <div className="pdp__stage" style={{ '--aisle-accent': accent }}>
            {images.length ? (
              <Image
                key={images[active]}
                src={images[active]}
                alt={product.title}
                width={720}
                height={720}
                priority={!isModal}
              />
            ) : (
              // No photo yet: the aisle's glyph on its own colour reads as
              // "picture to follow", not as a broken image.
              <span className="pdp__glyph" aria-hidden="true">
                <i className={aisleIcon(product.categorySlug)}></i>
              </span>
            )}

            <div className="pdp__badges">
              {off && <span className="tag tag--sale">-{off}%</span>}
              {product.organic && <span className="tag tag--fresh">Organic</span>}
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="pdp__nav pdp__nav--prev"
                  onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}
                  aria-label="Previous photo"
                >
                  <i className="bx bx-chevron-left"></i>
                </button>
                <button
                  type="button"
                  className="pdp__nav pdp__nav--next"
                  onClick={() => setActive((i) => (i + 1) % images.length)}
                  aria-label="Next photo"
                >
                  <i className="bx bx-chevron-right"></i>
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="pdp__thumbs">
              {images.map((img, i) => (
                <button
                  key={img + i}
                  type="button"
                  className={`pdp__thumb ${i === active ? 'is-active' : ''}`}
                  onClick={() => setActive(i)}
                  aria-label={`Show photo ${i + 1}`}
                >
                  <Image src={img} alt="" width={120} height={120} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------- buy panel ---------- */}
        <div className="pdp__panel">
          <div className="pdp__eyebrow">
            {product.brand && <span className="pdp__brand">{product.brand}</span>}
            {product.brand && aisle && <span className="pdp__dot" aria-hidden="true" />}
            {aisle && (
              <Link href={`/catalog?category=${product.categorySlug}`} className="pdp__aisle">
                {aisle}
              </Link>
            )}
          </div>

          <h1 className="pdp__title">{product.title}</h1>
          <p className="pdp__pack">
            {packLabel(product)}
            {perUnit && <span> · {perUnit}</span>}
          </p>

          <div className="pdp__price">
            <strong>{formatMoney(price)}</strong>
            {off && <s>{formatMoney(product.comparePrice)}</s>}
            {off && <span className="pdp__save">Save {formatMoney(saving)}</span>}
          </div>

          <div className="pdp__chips">
            <span className={`pdp__chip is-${status.tone}`}>
              <span className="pdp__chip__dot" aria-hidden="true" />
              {status.label}
            </span>
            {expiry && sellable && (
              <span className={`pdp__chip ${expiry.key === 'soon' ? 'is-warning' : ''}`}>
                <i className="bx bx-calendar"></i>
                Best before {prettyDate(product.expiry)}
              </span>
            )}
            {storage && (
              <span className="pdp__chip">
                <i className={STORAGE_ICONS[storage.value] || 'bx bx-package'}></i>
                {storage.label}
              </span>
            )}
          </div>

          {status.note && (
            <div className="pdp__notice" role="status">
              <i className="bx bx-info-circle"></i>
              <span>{status.note}</span>
            </div>
          )}

          {sellable && (
            <div className="pdp__buy">
              <div className="pdp__qty" aria-label="Quantity">
                <button type="button" onClick={() => step(-1)} disabled={quantity <= 1} aria-label="Decrease quantity">
                  <i className="bx bx-minus"></i>
                </button>
                <output aria-live="polite">{quantity}</output>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={quantity >= maxQuantity}
                  aria-label="Increase quantity"
                >
                  <i className="bx bx-plus"></i>
                </button>
              </div>

              <button type="button" className={`pdp__add ${added ? 'is-added' : ''}`} onClick={addToCart}>
                <i className={added ? 'bx bx-check' : 'bx bx-cart'}></i>
                {added ? 'Added to cart' : `Add to cart · ${formatMoney(price * quantity)}`}
              </button>
            </div>
          )}

          {sellable ? (
            <button type="button" className="pdp__now" onClick={buyNow}>
              Buy now
            </button>
          ) : (
            <Link
              href={product.categorySlug ? `/catalog?category=${product.categorySlug}` : '/catalog'}
              className="pdp__now"
            >
              Browse {aisle || 'the shop'} instead
            </Link>
          )}

          {promises.length > 0 && (
            <ul className="pdp__promises">
              {promises.map((p, i) => (
                <li key={p.id || i}>
                  <i className={p.icon || 'bx bx-check-shield'}></i>
                  <span>
                    <strong>{p.title}</strong>
                    {p.note && (
                      <small>{String(p.note).replace(/\{cutoff\}/g, contact?.orderCutoff || '4pm')}</small>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ---------- details ---------- */}
      {!isModal && (
        <div className={`pdp__details ${hasDescription ? '' : 'is-specs-only'}`}>
          {hasDescription && (
            <section className="pdp__card">
              <h2 className="pdp__card__title">About this product</h2>
              <div
                className="pdp__description"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </section>
          )}

          <section className="pdp__card">
            <h2 className="pdp__card__title">Product details</h2>
            <dl className="pdp__specs">
              {specs.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.href ? <Link href={row.href}>{row.value}</Link> : row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}

      {/* Phone buy bar — the real button scrolls away above the fold */}
      {!isModal && sellable && (
        <div className="pdp__buybar">
          <div className="pdp__buybar__price">
            <strong>{formatMoney(price * quantity)}</strong>
            <small>
              {quantity} × {packLabel(product)}
            </small>
          </div>
          <button type="button" className="pdp__buybar__btn" onClick={addToCart}>
            <i className={added ? 'bx bx-check' : 'bx bx-cart'}></i>
            {added ? 'Added' : 'Add to cart'}
          </button>
        </div>
      )}
    </div>
  )
}

ProductView.propTypes = {
  product: PropTypes.object.isRequired,
  isModal: PropTypes.bool,
}

export default ProductView
