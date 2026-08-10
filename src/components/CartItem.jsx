import React, { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import Image from 'next/image'

import { useDispatch } from 'react-redux'
import { updateItem, removeItem } from '../redux/shopping-cart/cartItemsSlide'

import { formatMoney, packLabel, unitPrice } from '../data/grocery'

const CartItem = (props) => {
  const dispatch = useDispatch()
  const itemRef = useRef(null)

  const [item, setItem] = useState(props.item)
  const [quantity, setQuantity] = useState(props.item.quantity)

  useEffect(() => {
    setItem(props.item)
    setQuantity(props.item.quantity)
  }, [props.item])

  const updateQuantity = (opt) => {
    const next = opt === '+' ? quantity + 1 : Math.max(1, quantity - 1)
    dispatch(updateItem({ ...item, quantity: next }))
  }

  const removeCartItem = () => dispatch(removeItem(item))

  const product = item.product || {}
  const mainImage = product.images?.[0]
  const perUnit = unitPrice(product)

  return (
    <div className="cart__item" ref={itemRef}>
      {mainImage && (
        <div className="cart__item__image">
          <Image
            src={mainImage}
            alt={product.title || 'Product'}
            width={100}
            height={100}
            className="object-cover"
          />
        </div>
      )}
      <div className="cart__item__info">
        <div className="cart__item__info__name">
          <Link href={product.slug ? `/product/${product.slug}` : '/catalog'}>
            {product.title || 'Product'}
          </Link>
          <span className="cart__item__info__meta">
            {product.unit ? packLabel(product) : ''}
            {perUnit ? ` · ${perUnit}` : ''}
          </span>
        </div>
        <div className="cart__item__info__price">
          {formatMoney(item.price)}
        </div>
        <div className="cart__item__info__quantity">
          <div className="product__info__item__quantity">
            <div
              className="product__info__item__quantity__btn"
              onClick={() => updateQuantity('-')}
            >
              <i className="bx bx-minus"></i>
            </div>
            <div className="product__info__item__quantity__input">{quantity}</div>
            <div
              className="product__info__item__quantity__btn"
              onClick={() => updateQuantity('+')}
            >
              <i className="bx bx-plus"></i>
            </div>
          </div>
        </div>
        <div className="cart__item__del">
          <i className="bx bx-trash" onClick={removeCartItem}></i>
        </div>
      </div>
    </div>
  )
}

CartItem.propTypes = {
  item: PropTypes.object.isRequired,
}

export default CartItem
