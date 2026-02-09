import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'

import { addItem } from '../redux/shopping-cart/cartItemsSlide'
import { remove } from '../redux/product-modal/productModalSlice'

import Button from './Button'
import numberWithCommas from '../utils/numberWithCommas'
import Image from 'next/image'

const ProductView = ({ product: propProduct }) => {
  const dispatch = useDispatch()
  const router = useRouter()

  const product = propProduct || {
    title: '',
    price: 0,
    images: ['/placeholder.png', '/placeholder.png'], // Firestore uses images array
    categorySlug: '',
    colors: [],
    slug: '',
    size: [],
    description: '',
  }

  const [previewImg, setPreviewImg] = useState(product.images[0])
  const [descriptionExpand, setDescriptionExpand] = useState(false)
  const [color, setColor] = useState(undefined)
  const [size, setSize] = useState(undefined)
  const [quantity, setQuantity] = useState(1)

  const updateQuantity = (type) => {
    setQuantity(prev => type === 'plus' ? prev + 1 : prev > 1 ? prev - 1 : 1)
  }

  useEffect(() => {
    setPreviewImg(product.images[0])
    setQuantity(1)
    setColor(undefined)
    setSize(undefined)
  }, [product])

  const check = () => {
    if (!color) { alert('Please select a color!'); return false }
    if (!size) { alert('Please select a size!'); return false }
    return true
  }

  const addToCart = () => {
    if (check()) {
      dispatch(addItem({ slug: product.slug, color, size, price: product.price, quantity }))
    }
  }

  const goToCart = () => {
    if (check()) {
      dispatch(addItem({ slug: product.slug, color, size, price: product.price, quantity }))
      dispatch(remove())
      router.push('/cart')
    }
  }

  return (
    <div className="product">
      {/* Images */}
      <div className="product__images">
        <div className="product__images__list">
          {product.images.map((img, idx) => (
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

        {/* Description */}
        <div className={`product-description ${descriptionExpand ? 'expand' : ''}`}>
          <div className="product-description__title">Product Details</div>
          <div className="product-description__content" dangerouslySetInnerHTML={{ __html: product.description }} />
          <div className="product-description__toggle">
            <Button size="sm" onClick={() => setDescriptionExpand(!descriptionExpand)}>
              {descriptionExpand ? 'Collapse' : 'See more'}
            </Button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="product__info">
        <h1 className="product__info__title">{product.title}</h1>
        <div className="product__info__item">
          <span className="product__info__item__price">{numberWithCommas(product.price)}</span>
        </div>

        {/* Colors */}
        <div className="product__info__item">
          <div className="product__info__item__title">Color</div>
          <div className="product__info__item__list">
            {product.colors.map((c, i) => (
              <div
                key={i}
                className={`product__info__item__list__item ${color === c ? 'active' : ''}`}
                onClick={() => setColor(c)}
              >
                <div className={`circle bg-${c}`}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Sizes */}
        <div className="product__info__item">
          <div className="product__info__item__title">Size</div>
          <div className="product__info__item__list">
            {product.size.map((s, i) => (
              <div
                key={i}
                className={`product__info__item__list__item ${size === s ? 'active' : ''}`}
                onClick={() => setSize(s)}
              >
                <span className="product__info__item__list__item__size">{s}</span>
              </div>
            ))}
          </div>
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
        </div>

        {/* Buttons */}
        <div className="product__info__item">
          <Button size='sm' onClick={addToCart}>Add to cart</Button>
          <Button size='sm' onClick={goToCart}>Buy now</Button>
        </div>
      </div>
    </div>
  )
}

ProductView.propTypes = {
  product: PropTypes.object.isRequired,
}

export default ProductView
