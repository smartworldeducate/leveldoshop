import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Head from 'next/head'

import InfinityList from '../components/InfinityList'
import { fetchProducts } from '../redux/products/productsSlice'

export default function Accessories() {
  const dispatch = useDispatch()
  const allProducts = useSelector(state => state.products.items)
  const [products, setProducts] = useState([])

  // Fetch products via Redux on mount
  useEffect(() => {
    dispatch(fetchProducts())
  }, [dispatch])

  // Set products for page
  useEffect(() => {
    if (!allProducts || allProducts.length === 0) return
    // Show all products for now
    setProducts(allProducts)
  }, [allProducts])

  return (
    <>
      <Head>
        <title>Accessories</title>
        <meta name="description" content="Shop accessories products" />
      </Head>

      <div className="catalog">
        <div className="catalog__content">
          <InfinityList
            data={products.map(p => ({
              ...p,
              image01: p.images[0],
              image02: p.images[1] || p.images[0]
            }))}
          />
        </div>
      </div>
    </>
  )
}
