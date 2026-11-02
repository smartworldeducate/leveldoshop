import React from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import { useDispatch } from 'react-redux'
import { AlertTriangle, Minus, Plus, Trash2 } from 'lucide-react'

import { ItemThumb } from './ReturnBits'
import { updateItem, removeItem } from '../redux/shopping-cart/cartItemsSlide'
import { formatMoney, packLabel, unitPrice } from '../data/grocery'

/** One basket line. `problem` says why it can't be ordered as it stands. */
const CartItem = ({ item, problem }) => {
  const dispatch = useDispatch()
  const { quantity } = item
  const product = item.product

  const change = (next) => dispatch(updateItem({ ...item, quantity: next }))
  const remove = () => dispatch(removeItem(item))

  const details = product
    ? [product.unit && packLabel(product), unitPrice(product)].filter(Boolean).join(' · ')
    : ''

  return (
    <li className={`basket-line${problem ? ' basket-line--problem' : ''}`}>
      <ItemThumb src={product?.images?.[0]} />

      <div className="basket-line__info">
        {product ? (
          <Link href={`/product/${product.slug}`}>{product.title}</Link>
        ) : (
          <p>Product no longer available</p>
        )}
        {details && <span>{details}</span>}
        {problem && (
          <em>
            <AlertTriangle size={14} /> {problem}
          </em>
        )}
      </div>

      {product && (
        <div className="qty-stepper" role="group" aria-label={`Quantity of ${product.title}`}>
          <button type="button" aria-label="One less" disabled={quantity <= 1} onClick={() => change(quantity - 1)}>
            <Minus size={14} />
          </button>
          <span aria-live="polite">{quantity}</span>
          <button type="button" aria-label="One more" onClick={() => change(quantity + 1)}>
            <Plus size={14} />
          </button>
        </div>
      )}

      <strong className="basket-line__price">
        {formatMoney(Number(item.price) * Number(quantity))}
        {quantity > 1 && <small>{formatMoney(item.price)} each</small>}
      </strong>

      <button
        type="button"
        className="basket-line__remove"
        aria-label={`Remove ${product?.title || 'item'} from basket`}
        onClick={remove}
      >
        <Trash2 size={17} />
      </button>
    </li>
  )
}

CartItem.propTypes = {
  item: PropTypes.object.isRequired,
  problem: PropTypes.string,
}

export default CartItem
