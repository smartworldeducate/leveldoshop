import React from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import Image from 'next/image'

import { useDispatch } from 'react-redux'
import { set } from '../redux/product-modal/productModalSlice'

import Button from './Button'
import numberWithCommas from '../utils/numberWithCommas'

const ProductCard = ({ img01, img02, name, price, slug }) => {
  const dispatch = useDispatch()

  return (
    <div className="product-card">
      {/* Remove <a> and use Link directly */}
      <Link href={`/product/${slug}`} passHref>
        <div className="product-card__image">
          <Image src={img01} alt={name} width={300} height={300} />
          <Image src={img02} alt={name} width={300} height={300} />
        </div>
        <h3 className="product-card__name">{name}</h3>
        <div className="product-card__price">
          {numberWithCommas(price)}
          <span className="product-card__price__old">
            <del>{numberWithCommas(399000)}</del>
          </span>
        </div>
      </Link>

      <div className="product-card__btn">
        <Button
          size="sm"
          icon="bx bx-cart"
          animate
          onClick={() => dispatch(set(slug))}
        >
          Buy now
        </Button>
      </div>
    </div>
  )
}

ProductCard.propTypes = {
  img01: PropTypes.string.isRequired,
  img02: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  slug: PropTypes.string.isRequired
}

export default ProductCard
