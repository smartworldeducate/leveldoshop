import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'

import Grid from './Grid'
import ProductCard from './ProductCard'

const InfinityList = ({ data: initialData }) => {
  const perLoad = 6 // items each load
  const listRef = useRef(null)

  const [data, setData] = useState([])
  const [load, setLoad] = useState(true)
  const [index, setIndex] = useState(0)

  // Initialize data on mount or when initialData changes
  useEffect(() => {
    setData(initialData.slice(0, perLoad))
    setIndex(1)
  }, [initialData])

  // Scroll listener (client-side only)
  useEffect(() => {
    const handleScroll = () => {
      if (
        listRef.current &&
        window.scrollY + window.innerHeight >=
          listRef.current.clientHeight + listRef.current.offsetTop + 200
      ) {
        setLoad(true)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Load more items
  useEffect(() => {
    if (!load) return

    const pages = Math.floor(initialData.length / perLoad)
    const maxIndex = initialData.length % perLoad === 0 ? pages : pages + 1

    if (index <= maxIndex) {
      const start = perLoad * index
      const end = start + perLoad
      setData((prev) =>
        prev.concat(initialData.slice(start, end))
      )
      setIndex((prev) => prev + 1)
    }

    setLoad(false)
  }, [load, index, initialData])

  return (
    <div ref={listRef}>
      <Grid col={3} mdCol={2} smCol={1} gap={20}>
        {data.map((item, idx) => (
          <ProductCard
            key={idx}
            img01={item.images[0] || '/placeholder.png'} // first image from Firestore
            img02={item.images[1] || item.images[0] || '/placeholder.png'} // second image fallback
            name={item.title}
            price={Number(item.price)}
            slug={item.slug}
          />
        ))}
      </Grid>
    </div>
  )
}

InfinityList.propTypes = {
  data: PropTypes.array.isRequired
}

export default InfinityList
