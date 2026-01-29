import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Head from 'next/head'

import CheckBox from '../components/CheckBox'
import Button from '../components/Button'
import InfinityList from '../components/InfinityList'
import { fetchProducts } from '../redux/products/productsSlice'

export default function Catalog() {
  const dispatch = useDispatch()
  const allProducts = useSelector(state => state.products.items)
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState({ category: [], color: [], size: [] })
  const filterRef = useRef(null)

  // Fetch products via Redux on mount
  useEffect(() => {
    dispatch(fetchProducts())
  }, [dispatch])

  const filterSelect = (type, checked, item) => {
    if (checked) {
      switch (type) {
        case 'CATEGORY':
          setFilter(prev => ({ ...prev, category: [...prev.category, item] }))
          break
        case 'COLOR':
          setFilter(prev => ({ ...prev, color: [...prev.color, item] }))
          break
        case 'SIZE':
          setFilter(prev => ({ ...prev, size: [...prev.size, item] }))
          break
      }
    } else {
      switch (type) {
        case 'CATEGORY':
          setFilter(prev => ({ ...prev, category: prev.category.filter(c => c !== item) }))
          break
        case 'COLOR':
          setFilter(prev => ({ ...prev, color: prev.color.filter(c => c !== item) }))
          break
        case 'SIZE':
          setFilter(prev => ({ ...prev, size: prev.size.filter(s => s !== item) }))
          break
      }
    }
  }

  const clearFilter = () => setFilter({ category: [], color: [], size: [] })

  const updateProducts = useCallback(() => {
    if (!allProducts || allProducts.length === 0) return
    let temp = [...allProducts]
    if (filter.category.length > 0) temp = temp.filter(p => filter.category.includes(p.categorySlug))
    if (filter.color.length > 0) temp = temp.filter(p => p.colors.some(c => filter.color.includes(c)))
    if (filter.size.length > 0) temp = temp.filter(p => p.size.some(s => filter.size.includes(s)))
    setProducts(temp)
  }, [allProducts, filter])

  useEffect(() => { updateProducts() }, [updateProducts])

  const showHideFilter = () => filterRef.current.classList.toggle('active')

  return (
    <>
      <Head>
        <title>Shop</title>
        <meta name="description" content="Catalog page with product filters" />
      </Head>

      <div className="catalog">
        <div className="catalog__filter" ref={filterRef}>
          <div className="catalog__filter__close" onClick={showHideFilter}>
            <i className="bx bx-left-arrow-alt"></i>
          </div>

          {/* Category filter */}
          <div className="catalog__filter__widget">
            <div className="catalog__filter__widget__title">Category</div>
            <div className="catalog__filter__widget__content">
              {[...new Set(allProducts.map(p => p.categorySlug))].map((cat, idx) => (
                <CheckBox
                  key={idx}
                  label={cat}
                  checked={filter.category.includes(cat)}
                  onChange={e => filterSelect('CATEGORY', e.checked, cat)}
                />
              ))}
            </div>
          </div>

          {/* Color filter */}
          <div className="catalog__filter__widget">
            <div className="catalog__filter__widget__title">Color</div>
            <div className="catalog__filter__widget__content">
              {[...new Set(allProducts.flatMap(p => p.colors))].map((c, idx) => (
                <CheckBox
                  key={idx}
                  label={c}
                  checked={filter.color.includes(c)}
                  onChange={e => filterSelect('COLOR', e.checked, c)}
                />
              ))}
            </div>
          </div>

          {/* Size filter */}
          <div className="catalog__filter__widget">
            <div className="catalog__filter__widget__title">Size</div>
            <div className="catalog__filter__widget__content">
              {[...new Set(allProducts.flatMap(p => p.size))].map((s, idx) => (
                <CheckBox
                  key={idx}
                  label={s}
                  checked={filter.size.includes(s)}
                  onChange={e => filterSelect('SIZE', e.checked, s)}
                />
              ))}
            </div>
          </div>

          <Button size="sm" onClick={clearFilter}>Clear filters</Button>
        </div>

        <div className="catalog__filter__toggle">
          <Button size="sm" onClick={showHideFilter}>Filters</Button>
        </div>

        <div className="catalog__content">
          <InfinityList data={products.map(p => ({
            ...p,
            image01: p.images[0],
            image02: p.images[1] || p.images[0]
          }))} />
        </div>
      </div>
    </>
  )
}
