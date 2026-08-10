import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import Image from 'next/image'

import { useDispatch } from 'react-redux'
import { addItem } from '../redux/shopping-cart/cartItemsSlide'

import {
  aisleIcon,
  discountPercent,
  formatMoney,
  isSellable,
  packLabel,
  stockState,
  unitPrice,
} from '../data/grocery'

/**
 * Dense market tile: photo well, badges, name, pack + unit price, price row and
 * a round add button. Everything is always visible — hover-only actions hide
 * the primary verb from touch users, which is most grocery traffic.
 */
const ProductCard = ({ product }) => {
  const dispatch = useDispatch()
  const [added, setAdded] = useState(false)

  const img = product.images?.[0]
  const off = discountPercent(product)
  const stock = stockState(product.stock)
  const perUnit = unitPrice(product)
  const sellable = isSellable(product)

  const addToCart = () => {
    if (!sellable) return
    dispatch(addItem({ slug: product.slug, price: Number(product.price), quantity: 1 }))
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <article className={`p-card ${sellable ? '' : 'is-unavailable'}`}>
      <Link href={`/product/${product.slug}`} className="p-card__media">
        {/* An empty placeholder rectangle makes a stocked shelf look broken;
            the aisle's own icon reads as "photo to follow". */}
        {img ? (
          <Image src={img} alt={product.title} width={320} height={320} />
        ) : (
          <span className="p-card__glyph" aria-hidden="true">
            <i className={aisleIcon(product.categorySlug)}></i>
          </span>
        )}

        <div className="p-card__badges">
          {off && <span className="tag tag--sale">-{off}%</span>}
          {product.organic && <span className="tag tag--fresh">Organic</span>}
        </div>

        {!sellable && <span className="p-card__veil">{stock.key === 'out' ? 'Sold out' : 'Unavailable'}</span>}
      </Link>

      <div className="p-card__body">
        <Link href={`/product/${product.slug}`} className="p-card__name">
          {product.title}
        </Link>

        <p className="p-card__meta">
          {packLabel(product)}
          {perUnit && <span> · {perUnit}</span>}
        </p>

        <div className="p-card__foot">
          <div className="p-card__price">
            <strong>{formatMoney(product.price)}</strong>
            {off && <s>{formatMoney(product.comparePrice)}</s>}
          </div>

          <button
            type="button"
            className={`p-card__add ${added ? 'is-added' : ''}`}
            onClick={addToCart}
            disabled={!sellable}
            aria-label={sellable ? `Add ${product.title} to basket` : 'Sold out'}
          >
            <i className={added ? 'bx bx-check' : 'bx bx-plus'}></i>
          </button>
        </div>

        {stock.key === 'low' && <p className="p-card__stock">Only {product.stock} left</p>}
      </div>
    </article>
  )
}

ProductCard.propTypes = {
  product: PropTypes.object.isRequired,
}

export default ProductCard
