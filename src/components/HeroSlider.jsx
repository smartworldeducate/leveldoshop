import React, { useEffect, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import Image from 'next/image'

import Button from './Button'

const HeroSlider = ({ data, control = false, auto = true, timeOut = 3000 }) => {
  const [activeSlide, setActiveSlide] = useState(0)

  const nextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1 === data.length ? 0 : prev + 1))
  }, [data.length])

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 < 0 ? data.length - 1 : prev - 1))
  }

  useEffect(() => {
    if (!auto) return
    const slideInterval = setInterval(nextSlide, timeOut)
    return () => clearInterval(slideInterval)
  }, [nextSlide, timeOut, auto])

  return (
    <div className="hero-slider">
      {data.map((item, index) => (
        <HeroSliderItem key={index} item={item} active={index === activeSlide} />
      ))}

      {control && (
        <div className="hero-slider__control">
          <div className="hero-slider__control__item" onClick={prevSlide}>
            <i className="bx bx-chevron-left"></i>
          </div>
          <div className="hero-slider__control__item">
            <div className="index">
              {activeSlide + 1}/{data.length}
            </div>
          </div>
          <div className="hero-slider__control__item" onClick={nextSlide}>
            <i className="bx bx-chevron-right"></i>
          </div>
        </div>
      )}
    </div>
  )
}

HeroSlider.propTypes = {
  data: PropTypes.array.isRequired,
  control: PropTypes.bool,
  auto: PropTypes.bool,
  timeOut: PropTypes.number
}

// Single slide item
const HeroSliderItem = ({ item, active }) => (
  <div className={`hero-slider__item ${active ? 'active' : ''}`}>
    <div className="hero-slider__item__info">
      <div className={`hero-slider__item__info__title color-${item.color}`}>
        <span>{item.title}</span>
      </div>
      <div className="hero-slider__item__info__description">
        <span>{item.description}</span>
      </div>
      <div className="hero-slider__item__info__btn">
        {/* ✅ Removed <a> child */}
        <Link href="/catalog" passHref>
          <Button backgroundColor={item.color} icon="bx bx-cart" animate>
            View details
          </Button>
        </Link>
      </div>
    </div>
    <div className="hero-slider__item__image">
      <div className={`shape bg-${item.color}`}></div>
      <Image src={item.img} alt={item.title} width={500} height={400} />
    </div>
  </div>
)

export default HeroSlider
