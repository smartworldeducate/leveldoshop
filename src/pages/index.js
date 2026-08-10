import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'

import MarketHero from '../components/MarketHero'
import PromiseStrip from '../components/PromiseStrip'
import HowItWorks from '../components/HowItWorks'
import CategoryStrip from '../components/CategoryStrip'
import PromoMosaic from '../components/PromoMosaic'
import SectionHead from '../components/SectionHead'
import ProductRail from '../components/ProductRail'
import Grid from '../components/Grid'
import ProductCard from '../components/ProductCard'

import { discountPercent, expiryState, isSellable, visibleCategories } from '../data/grocery'
import { DEFAULT_HOME, headingOf, orDefault } from '../data/home'
import { excerptOf, formatPostDate, readingTime } from '../utils/post'

// Redux
import { useSelector, useDispatch } from 'react-redux'
import { fetchProducts } from '../redux/products/productsSlice'
import { fetchPosts } from '../redux/posts/postsSlice'

export default function Home() {
  const dispatch = useDispatch()
  const [freshAisle, setFreshAisle] = useState('all')
  const products = useSelector(state => state.products.items)
  const categories = useSelector(state => state.categories.items)
  const posts = useSelector(state => state.posts.items)
  const { storeName, sections, pages, home } = useSelector(state => state.settings.values)

  // Every heading, banner and button label on this page is written in the
  // dashboard; `headingOf` falls back to the shipped copy field by field.
  const head = (key) => headingOf(home, key)
  const rewards = home?.rewards || DEFAULT_HOME.rewards
  const closer = home?.closer || DEFAULT_HOME.closer

  const showBlog = sections?.blog !== false && pages?.posts !== false

  useEffect(() => {
    dispatch(fetchProducts())
  }, [dispatch])

  // Only pay for the posts read when the teaser is actually going to render.
  useEffect(() => {
    if (showBlog) dispatch(fetchPosts())
  }, [dispatch, showBlog])

  const on = (key) => sections?.[key] !== false

  // Shelves are derived, not shuffled: a grocery front page should be stable
  // between visits so shoppers can find the same item twice. Products in a
  // hidden aisle never reach the storefront.
  const { deals, sellable, everything, freshTabs, showSecondGrid } = useMemo(() => {
    const hidden = categories.filter(c => c.visible === false).map(c => c.slug)
    const listable = products.filter(p => !hidden.includes(p.categorySlug))
    const stocked = listable.filter(isSellable)

    return {
      deals: stocked.filter((p) => discountPercent(p) || expiryState(p.expiry)?.key === 'soon'),
      sellable: stocked,
      everything: listable,
      // Only aisles that can actually fill the grid become tabs — a filter that
      // empties the shelf is worse than no filter.
      freshTabs: visibleCategories(categories).filter((c) =>
        stocked.some((p) => p.categorySlug === c.slug)
      ),
      // With a small catalogue both grids would show the same handful of items,
      // which reads as padding. One shelf is better than two identical ones.
      showSecondGrid: listable.length > 12,
    }
  }, [products, categories])

  const freshIn = useMemo(
    () =>
      (freshAisle === 'all'
        ? sellable
        : sellable.filter((p) => p.categorySlug === freshAisle)
      ).slice(0, 12),
    [sellable, freshAisle]
  )

  return (
    <>
      <Head>
        <title>{`${storeName || 'Leveldo Grocery'} — fresh food, delivered today`}</title>
        <meta
          name="description"
          content="Fruit, vegetables, dairy, bakery and the full weekly shop, delivered the same day."
        />
      </Head>

      <MarketHero />

      {/* Rides up over the hero's lower edge, the way a shop's promises sit on
          the window rather than below it. */}
      {on('promise') && (
        <section className="home-block home-block--overlap">
          <PromiseStrip />
        </section>
      )}

      {on('aisles') && (
        <section className="home-block">
          <SectionHead
            kicker={head('aisles').kicker}
            title={head('aisles').title}
            note={head('aisles').note}
            href="/catalog"
            linkLabel={head('aisles').linkLabel}
          />
          <CategoryStrip products={products} />
        </section>
      )}

      {on('offers') && (
        <section className="home-block">
          <PromoMosaic />
        </section>
      )}

      {on('deals') && deals.length > 0 && (
        <section className="home-block">
          <SectionHead
            kicker={head('deals').kicker}
            title={head('deals').title}
            note={head('deals').note}
            href={pages?.deals === false ? undefined : '/deals'}
            linkLabel={head('deals').linkLabel}
          />
          <ProductRail items={deals} />
        </section>
      )}

      {on('fresh') && (
        <section className="home-block">
          <SectionHead
            kicker={head('fresh').kicker}
            title={head('fresh').title}
            note={head('fresh').note}
            href="/catalog"
            linkLabel={head('fresh').linkLabel}
          />

          {/* Filtering in place beats sending the shopper to the catalogue and
              back for a look at one aisle. */}
          {freshTabs.length > 1 && (
            <div className="filter-tabs" role="tablist" aria-label="Filter by aisle">
              <button
                type="button"
                role="tab"
                aria-selected={freshAisle === 'all'}
                className={`filter-tabs__tab ${freshAisle === 'all' ? 'is-active' : ''}`}
                onClick={() => setFreshAisle('all')}
              >
                Everything
              </button>

              {freshTabs.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  role="tab"
                  aria-selected={freshAisle === c.slug}
                  className={`filter-tabs__tab ${freshAisle === c.slug ? 'is-active' : ''}`}
                  onClick={() => setFreshAisle(c.slug)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <Grid col={6} mdCol={3} smCol={2} gap={20}>
            {freshIn.map(item => (
              <ProductCard key={item.id} product={item} />
            ))}
          </Grid>
        </section>
      )}

      <section className="home-block">
        <SectionHead
          kicker={head('steps').kicker}
          title={head('steps').title}
          note={head('steps').note}
        />
        <HowItWorks />
      </section>

      {/* Membership band — drawn in CSS, so it needs no photography */}
      {on('promo') && (
        <section className="home-block">
          <div className="promo-band">
            <div className="promo-band__copy">
              {rewards.kicker && <span className="promo-band__kicker">{rewards.kicker}</span>}
              <h2>{orDefault(rewards.title, DEFAULT_HOME.rewards.title)}</h2>
              {rewards.body && <p>{rewards.body}</p>}
              <div className="promo-band__actions">
                <Link href={orDefault(rewards.ctaHref, '/login')} className="promo-band__cta">
                  {orDefault(rewards.ctaLabel, 'Join free')}
                </Link>
                {rewards.linkLabel && rewards.linkHref && (
                  <Link href={rewards.linkHref} className="promo-band__link">
                    {rewards.linkLabel}
                    <i className="bx bx-right-arrow-alt"></i>
                  </Link>
                )}
              </div>
            </div>

            {rewards.points?.length > 0 && (
              <ul className="promo-band__points">
                {rewards.points
                  .filter((point) => (point.title || '').trim())
                  .map((point, i) => (
                    <li key={point.id || i}>
                      <i className={point.icon || 'bx bx-star'}></i>
                      <span>
                        <strong>{point.title}</strong>
                        {point.note && <small>{point.note}</small>}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {on('blog') && pages?.posts !== false && posts.length > 0 && (
        <section className="home-block">
          <SectionHead
            kicker={head('blog').kicker}
            title={head('blog').title}
            note={head('blog').note}
            href="/posts"
            linkLabel={head('blog').linkLabel}
          />
          <div className="blog-grid">
            {posts.slice(0, 3).map((post) => (
              <Link key={post.id} href={`/posts/${post.slug}`} className="post-card">
                <div className="post-card__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.images?.[0] || '/placeholder.png'} alt="" />
                </div>
                <div className="post-card__body">
                  <div className="post-card__meta">
                    <span>{formatPostDate(post.createdAt)}</span>
                    <span className="post-card__dot" />
                    <span>{readingTime(post.content)} min read</span>
                  </div>
                  <h3 className="post-card__title">{post.title}</h3>
                  <p className="post-card__excerpt">{excerptOf(post.content, 110)}</p>
                  <span className="post-card__more">
                    Read article
                    <i className="bx bx-chevron-right"></i>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* A slice, not the whole catalogue — the full list is one click away and
          dumping every product here made the page grow without limit. */}
      {on('everything') && showSecondGrid && (
        <section className="home-block">
          <SectionHead
            kicker={head('everything').kicker}
            title={head('everything').title}
            note={
              head('everything').note ||
              `${everything.length} product${everything.length === 1 ? '' : 's'} in the shop`
            }
            href="/catalog"
            linkLabel={head('everything').linkLabel}
          />
          <Grid col={6} mdCol={3} smCol={2} gap={20}>
            {everything.slice(12, 24).map(item => (
              <ProductCard key={item.id} product={item} />
            ))}
          </Grid>
        </section>
      )}

      {/* Closing invitation — a landing page should end on a way forward */}
      <section className="home-block">
        <div className="closer">
          <div>
            <h2>{orDefault(closer.title, DEFAULT_HOME.closer.title)}</h2>
            <p>
              {closer.body ||
                (everything.length > 0
                  ? `${everything.length} product${
                      everything.length === 1 ? '' : 's'
                    } on the shelf, delivered the same day.`
                  : 'The shelves are being stocked — check back shortly.')}
            </p>
          </div>
          <div className="closer__actions">
            <Link href={orDefault(closer.primaryHref, '/catalog')} className="closer__primary">
              {orDefault(closer.primaryLabel, 'Start shopping')}
            </Link>
            {closer.ghostLabel && closer.ghostHref && pages?.contact !== false && (
              <Link href={closer.ghostHref} className="closer__ghost">
                {closer.ghostLabel}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
