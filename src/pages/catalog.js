import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Head from 'next/head'
import { useRouter } from 'next/router'

import CheckBox from '../components/CheckBox'
import Grid from '../components/Grid'
import ProductCard from '../components/ProductCard'
import SearchModal from '@/components/SearchModal'
import { fetchProducts } from '../redux/products/productsSlice'
import { categoryLabel, isSellable, prettySlug, visibleCategories } from '../data/grocery'

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
]

const EMPTY_FILTER = { category: [], inStock: false, organic: false, maxPrice: null }

export default function Catalog() {
  const router = useRouter()
  const dispatch = useDispatch()
  const allProducts = useSelector(state => state.products.items)
  const loading = useSelector(state => state.products.loading)
  const categories = useSelector(state => state.categories.items)

  const visible = useMemo(() => visibleCategories(categories), [categories])
  // A hidden aisle takes its products off the storefront with it.
  const hiddenSlugs = useMemo(
    () => categories.filter(c => c.visible === false).map(c => c.slug),
    [categories]
  )

  const [searchText, setSearchText] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [filter, setFilter] = useState(EMPTY_FILTER)
  const [sort, setSort] = useState('newest')
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    dispatch(fetchProducts())
  }, [dispatch])

  // Deep links: ?category= from the aisle bar, ?q= from either search box.
  useEffect(() => {
    if (typeof router.query.category === 'string') {
      setFilter(prev => ({ ...prev, category: [router.query.category] }))
    }
    if (typeof router.query.q === 'string') setSearchText(router.query.q)
    if (router.query.search === '1') setShowSearch(true)
  }, [router.query])

  const closeSearch = () => {
    setShowSearch(false)
    router.replace('/catalog', undefined, { shallow: true })
  }

  const priceCeiling = useMemo(() => {
    const top = Math.max(0, ...allProducts.map(p => Number(p.price) || 0))
    return Math.ceil(top) || 100
  }, [allProducts])

  // Every visible aisle is listed with its count — a zero tells the shopper the
  // aisle is empty rather than leaving them to wonder where it went.
  const aisles = useMemo(() => {
    const counts = allProducts.reduce((acc, p) => {
      if (p.categorySlug) acc[p.categorySlug] = (acc[p.categorySlug] || 0) + 1
      return acc
    }, {})

    const known = visible.map(c => ({ ...c, count: counts[c.slug] || 0 }))
    // Products can still reference an aisle that was renamed or removed; list
    // those separately so they stay reachable instead of vanishing.
    const strays = Object.keys(counts)
      .filter(slug => !categories.some(c => c.slug === slug))
      .map(slug => ({ slug, name: prettySlug(slug), accent: '#94A3B8', count: counts[slug] }))

    return [...known, ...strays]
  }, [allProducts, visible, categories])

  const toggleCategory = (slug, checked) =>
    setFilter(prev => ({
      ...prev,
      category: checked ? [...prev.category, slug] : prev.category.filter(c => c !== slug),
    }))

  const clearFilter = () => setFilter(EMPTY_FILTER)

  const products = useMemo(() => {
    const term = searchText.trim().toLowerCase()
    let list = allProducts.filter(p => {
      if (hiddenSlugs.includes(p.categorySlug)) return false
      if (term && !`${p.title} ${p.brand || ''}`.toLowerCase().includes(term)) return false
      if (filter.category.length && !filter.category.includes(p.categorySlug)) return false
      if (filter.inStock && !isSellable(p)) return false
      if (filter.organic && !p.organic) return false
      if (filter.maxPrice != null && (Number(p.price) || 0) > filter.maxPrice) return false
      return true
    })

    if (sort === 'price-asc') list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0))
    else if (sort === 'price-desc') list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0))
    else if (sort === 'name') list = [...list].sort((a, b) => a.title.localeCompare(b.title))

    return list
  }, [allProducts, filter, searchText, sort, hiddenSlugs])

  const activeCount =
    filter.category.length +
    (filter.inStock ? 1 : 0) +
    (filter.organic ? 1 : 0) +
    (filter.maxPrice != null ? 1 : 0)

  const heading =
    filter.category.length === 1
      ? categoryLabel(categories, filter.category[0])
      : 'All groceries'

  return (
    <>
      <Head>
        <title>{`Shop ${heading.toLowerCase()}`}</title>
        <meta name="description" content="Browse the full grocery range by aisle, price and availability." />
      </Head>

      <div className="catalog">
        <aside className={`catalog__filter ${drawerOpen ? 'is-open' : ''}`}>
          <div className="catalog__filter__head">
            <span>Filters</span>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close filters">
              <i className="bx bx-x"></i>
            </button>
          </div>

          <div className="catalog__filter__widget">
            <div className="catalog__filter__widget__title">Aisle</div>
            <div className="catalog__filter__widget__content">
              {aisles.map(c => (
                <CheckBox
                  key={c.slug}
                  label={c.name}
                  count={c.count}
                  checked={filter.category.includes(c.slug)}
                  onChange={e => toggleCategory(c.slug, e.checked)}
                />
              ))}
            </div>
          </div>

          <div className="catalog__filter__widget">
            <div className="catalog__filter__widget__title">Availability</div>
            <div className="catalog__filter__widget__content">
              <CheckBox
                label="In stock today"
                checked={filter.inStock}
                onChange={e => setFilter(prev => ({ ...prev, inStock: e.checked }))}
              />
              <CheckBox
                label="Certified organic"
                checked={filter.organic}
                onChange={e => setFilter(prev => ({ ...prev, organic: e.checked }))}
              />
            </div>
          </div>

          <div className="catalog__filter__widget">
            <div className="catalog__filter__widget__title">
              Price up to <strong>${filter.maxPrice ?? priceCeiling}</strong>
            </div>
            <div className="catalog__filter__widget__content">
              <input
                type="range"
                min="1"
                max={priceCeiling}
                value={filter.maxPrice ?? priceCeiling}
                onChange={e => setFilter(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
                className="catalog__filter__range"
              />
            </div>
          </div>

          <button type="button" className="catalog__filter__clear" onClick={clearFilter}>
            {activeCount ? `Clear ${activeCount} filter${activeCount > 1 ? 's' : ''}` : 'Clear filters'}
          </button>
        </aside>

        <div className="catalog__content">
          <div className="catalog__toolbar">
            <div>
              <h1 className="catalog__toolbar__heading">{heading}</h1>
              <span className="catalog__toolbar__count">
                {products.length} item{products.length === 1 ? '' : 's'}
                {searchText ? ` for “${searchText}”` : ''}
              </span>
            </div>

            <div className="catalog__toolbar__tools">
              <button
                type="button"
                className="catalog__toolbar__filters"
                onClick={() => setDrawerOpen(true)}
              >
                <i className="bx bx-filter-alt"></i>
                Filters{activeCount ? ` (${activeCount})` : ''}
              </button>

              <label className="catalog__toolbar__sort">
                <i className="bx bx-sort"></i>
                <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort products">
                  {SORTS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {products.length ? (
            <Grid col={5} mdCol={3} smCol={2} gap={20}>
              {products.map(item => (
                <ProductCard key={item.id || item.slug} product={item} />
              ))}
            </Grid>
          ) : (
            <div className="catalog__empty">
              <i className="bx bx-basket"></i>
              <p>{loading ? 'Loading the shelves…' : 'Nothing matches those filters.'}</p>
              {!loading && (
                <button type="button" className="catalog__filter__clear" onClick={clearFilter}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {drawerOpen && <div className="catalog__scrim" onClick={() => setDrawerOpen(false)} />}

      <SearchModal
        isOpen={showSearch}
        onClose={closeSearch}
        value={searchText}
        onChange={setSearchText}
      />
    </>
  )
}
