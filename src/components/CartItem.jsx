import React, { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'

import { useDispatch } from 'react-redux'
import { updateItem, removeItem } from '../redux/shopping-cart/cartItemsSlide'

import numberWithCommas from '../utils/numberWithCommas'
import Link from 'next/link'
import Image from 'next/image'

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
    if (opt === '+') {
      dispatch(updateItem({ ...item, quantity: quantity + 1 }))
    } else if (opt === '-') {
      dispatch(updateItem({ ...item, quantity: quantity - 1 === 0 ? 1 : quantity - 1 }))
    }
  }

  const removeCartItem = () => {
    dispatch(removeItem(item))
  }

  // Use first image from Firestore
  const product = item.product || {}
  const mainImage = product.images?.[0] // first image in array

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
          <Link href="/catalog">
            {`${product.title || 'Product'} - ${item.color || '-'} - ${item.size || '-'}`}
          </Link>
        </div>
        <div className="cart__item__info__price">
          {numberWithCommas(item.price)}
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
