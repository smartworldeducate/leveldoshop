import React, { useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import SectionHead from '../../components/SectionHead'
import Grid from '../../components/Grid'
import ProductCard from '../../components/ProductCard'
import ProductView from '../../components/ProductView'

import { isSellable } from '../../data/grocery'

// Redux
import { useSelector, useDispatch } from 'react-redux'
import { fetchProducts } from '../../redux/products/productsSlice'

const RELATED_COUNT = 5

export default function Product() {
  const router = useRouter()
  const { slug } = router.query
  const dispatch = useDispatch()

  const products = useSelector(state => state.products.items)
  const loading = useSelector(state => state.products.loading)
  const categories = useSelector(state => state.categories.items)
  const storeName = useSelector(state => state.settings.values.storeName)

  useEffect(() => {
    dispatch(fetchProducts())
  }, [dispatch])

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }, [slug])

  const product = useMemo(() => products.find(p => p.slug === slug) || null, [products, slug])

  // Same aisle first; a small aisle is topped up with other sellable products
  // so the shelf never ends after one or two cards. Hidden aisles stay hidden.
  const { related, sameAisleOnly } = useMemo(() => {
    if (!product) return { related: [], sameAisleOnly: true }
    const hidden = categories.filter(c => c.visible === false).map(c => c.slug)
    const pool = products.filter(
      p => p.slug !== product.slug && !hidden.includes(p.categorySlug)
    )
    const byStock = (a, b) => Number(isSellable(b)) - Number(isSellable(a))
    const same = pool.filter(p => p.categorySlug === product.categorySlug).sort(byStock)
    const others = pool.filter(p => p.categorySlug !== product.categorySlug && isSellable(p))
    const list = [...same, ...others].slice(0, RELATED_COUNT)
    return { related: list, sameAisleOnly: same.length >= list.length }
  }, [product, products, categories])

  // Products arrive client-side; until the first load finishes there is
  // nothing to say "not found" about.
  if (!product && (loading || !products.length || !slug)) {
    return (
      <div className="pdp pdp--loading" aria-busy="true">
        <div className="pdp__main">
          <div className="pdp__gallery"><div className="pdp__stage pdp__skeleton" /></div>
          <div className="pdp__panel">
            <div className="pdp__skeleton pdp__skeleton--line" style={{ width: '30%' }} />
            <div className="pdp__skeleton pdp__skeleton--title" />
            <div className="pdp__skeleton pdp__skeleton--line" style={{ width: '45%' }} />
            <div className="pdp__skeleton pdp__skeleton--block" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="pdp-missing">
        <Head>
          <title>{`Product not found — ${storeName || 'A-one Grocery'}`}</title>
        </Head>
        <span className="pdp-missing__icon" aria-hidden="true">
          <i className="bx bx-search-alt"></i>
        </span>
        <h1>We couldn&apos;t find that product</h1>
        <p>It may have been renamed or taken off the shelf.</p>
        <Link href="/catalog" className="pdp-missing__cta">
          Browse the shop
        </Link>
      </div>
    )
  }

  const description = String(product.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  return (
    <>
      <Head>
        <title>{`${product.title} — ${storeName || 'A-one Grocery'}`}</title>
        <meta name="description" content={(description || product.title).slice(0, 160)} />
        {product.images?.[0] && <meta property="og:image" content={product.images[0]} />}
      </Head>

      <ProductView product={product} />

      {related.length > 0 && (
        <section className="home-block pdp-related">
          <SectionHead
            kicker={sameAisleOnly ? 'Same aisle' : 'Keep shopping'}
            title={sameAisleOnly ? 'More from this aisle' : 'You might also like'}
            href={`/catalog?category=${product.categorySlug}`}
            linkLabel="See the aisle"
          />
          <Grid col={5} mdCol={3} smCol={2} gap={20}>
            {related.map((item) => (
              <ProductCard key={item.id || item.slug} product={item} />
            ))}
          </Grid>
        </section>
      )}
    </>
  )
}
