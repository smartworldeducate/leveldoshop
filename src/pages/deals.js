import React, { useEffect, useMemo } from 'react'
import PageGuard from '../components/PageGuard'
import { useSelector, useDispatch } from 'react-redux'
import Head from 'next/head'
import Link from 'next/link'

import SectionHead from '../components/SectionHead'
import Grid from '../components/Grid'
import ProductCard from '../components/ProductCard'
import { fetchProducts } from '../redux/products/productsSlice'
import { discountPercent, expiryState, isSellable } from '../data/grocery'

/**
 * Two kinds of saving, kept apart because they mean different things:
 * a marked-down price, and food that must move before its best-before date.
 */
function Deals() {
  const dispatch = useDispatch()
  const allProducts = useSelector(state => state.products.items)

  useEffect(() => {
    dispatch(fetchProducts())
  }, [dispatch])

  const { reduced, clearing } = useMemo(() => {
    const sellable = allProducts.filter(isSellable)
    return {
      reduced: sellable
        .filter(discountPercent)
        .sort((a, b) => discountPercent(b) - discountPercent(a)),
      clearing: sellable.filter(p => expiryState(p.expiry)?.key === 'soon'),
    }
  }, [allProducts])

  const nothing = !reduced.length && !clearing.length

  return (
    <>
      <Head>
        <title>Deals</title>
        <meta name="description" content="Marked-down groceries and items to use up this week." />
      </Head>

      {reduced.length > 0 && (
        <section className="home-block">
          <SectionHead title="Marked down this week" note={`${reduced.length} reduced`} />
          <Grid col={5} mdCol={3} smCol={2} gap={20}>
            {reduced.map(item => (
              <ProductCard key={item.id || item.slug} product={item} />
            ))}
          </Grid>
        </section>
      )}

      {clearing.length > 0 && (
        <section className="home-block">
          <SectionHead
            title="Use it this week"
            note="Perfectly good food nearing its best-before date — same quality, shorter window"
          />
          <Grid col={5} mdCol={3} smCol={2} gap={20}>
            {clearing.map(item => (
              <ProductCard key={item.id || item.slug} product={item} />
            ))}
          </Grid>
        </section>
      )}

      {nothing && (
        <section className="home-block">
          <div className="catalog__empty">
            <i className="bx bx-purchase-tag"></i>
            <p>No deals running right now — check back after the next delivery.</p>
            <Link href="/catalog" className="catalog__filter__clear">Shop everything</Link>
          </div>
        </section>
      )}
    </>
  )
}

// Switched off from the dashboard? Show a notice instead of the page.
export default function GuardedDeals(props) {
  return (
    <PageGuard page="deals" title="Deals">
      <Deals {...props} />
    </PageGuard>
  )
}
