import React, { useMemo } from 'react'
import Link from 'next/link'
import { useSelector } from 'react-redux'

import { aisleIcon, discountPercent, isSellable, visibleCategories } from '../data/grocery'
import { DEFAULT_HOME } from '../data/home'

const CLASS_BY_VARIANT = {
  tall: 'promo-tile--tall',
  wide: 'promo-tile--wide',
  dark: 'promo-tile--dark',
  right: 'promo-tile--tall promo-tile--right',
}

/**
 * Four-tile offer mosaic.
 *
 * In automatic mode every tile points at something the shop really has: the
 * deepest markdown, the whole deals shelf, an aisle worth visiting and the
 * newest arrival — and the block hides itself when there is nothing to
 * promote. Switch automatic off in the dashboard and the four tiles are
 * written by hand instead.
 */
export default function PromoMosaic() {
  const products = useSelector((state) => state.products.items)
  const categories = useSelector((state) => state.categories.items)
  const { pages, home } = useSelector((state) => state.settings.values)

  const config = home?.mosaic || DEFAULT_HOME.mosaic

  const tiles = useMemo(() => {
    // ---- tiles written in the dashboard ----
    if (config.auto === false) {
      return (config.tiles || [])
        .filter((t) => (t.title || '').trim() || (t.headline || '').trim())
        .map((t, i) => ({
          id: t.id || `tile-${i}`,
          className: CLASS_BY_VARIANT[t.variant] || CLASS_BY_VARIANT.tall,
          kicker: t.kicker,
          title: t.title,
          headline: t.headline,
          headlineNote: t.headlineNote,
          icon: t.icon || 'bx bx-basket',
          image: t.image || null,
          href: t.href || '/catalog',
        }))
    }

    // ---- tiles derived from the shelves ----
    const sellable = products.filter(isSellable)
    if (!sellable.length) return []

    const dealsHref = pages?.deals === false ? '/catalog' : '/deals'
    const aisles = visibleCategories(categories)

    const deals = sellable
      .map((p) => ({ product: p, pct: discountPercent(p) || 0 }))
      .filter((d) => d.pct > 0)
      .sort((a, b) => b.pct - a.pct)

    const best = deals[0]
    const runnerUp = deals[1]
    const newest = sellable[0]

    // Bakery makes the best dark tile (warm photo, short name); any other
    // stocked aisle does the job when the shop doesn't sell bread.
    const stocked = aisles.filter((c) => sellable.some((p) => p.categorySlug === c.slug))
    const feature =
      stocked.find((c) => c.slug === 'bakery') ||
      stocked.find((c) => c.slug !== best?.product.categorySlug) ||
      stocked[0]

    const out = []

    out.push(
      best
        ? {
            id: 'best',
            className: CLASS_BY_VARIANT.tall,
            kicker: 'Special deal',
            title: best.product.title,
            headline: `${best.pct}%`,
            headlineNote: 'off',
            image: best.product.images?.[0],
            icon: aisleIcon(best.product.categorySlug),
            href: `/product/${best.product.slug}`,
          }
        : {
            id: 'basket',
            className: CLASS_BY_VARIANT.tall,
            kicker: 'Weekly shop',
            title: 'Everything on the list',
            headline: 'One',
            headlineNote: 'delivery',
            image: newest?.images?.[0],
            icon: 'bx bx-basket',
            href: '/catalog',
          }
    )

    out.push({
      id: 'wide',
      className: CLASS_BY_VARIANT.wide,
      kicker: 'This week in store',
      title: deals.length ? 'Save up to' : 'Fresh in every',
      headline: deals.length ? `${best.pct}% OFF` : 'Morning',
      image: runnerUp?.product.images?.[0] || newest?.images?.[0],
      icon: deals.length ? 'bx bx-purchase-tag' : 'bx bx-time-five',
      href: deals.length ? dealsHref : '/catalog',
    })

    // The dark tile always appears — an empty cell in the middle row reads as a
    // broken grid. With no stocked aisle to feature it carries a promise, which
    // is true whatever the shelves hold.
    if (feature) {
      const featured = sellable.find((p) => p.categorySlug === feature.slug && p.images?.[0])
      out.push({
        id: 'dark',
        className: CLASS_BY_VARIANT.dark,
        kicker: 'Picked for you',
        title: feature.name,
        image: featured?.images?.[0],
        icon: aisleIcon(feature.slug),
        href: `/catalog?category=${feature.slug}`,
      })
    } else {
      out.push({
        id: 'dark',
        className: CLASS_BY_VARIANT.dark,
        kicker: 'No card needed',
        title: 'Cash on delivery',
        image: null,
        icon: 'bx bx-wallet',
        href: pages?.policy === false ? '/catalog' : '/policy?tab=cod',
      })
    }

    if (newest) {
      out.push({
        id: 'new',
        className: CLASS_BY_VARIANT.right,
        kicker: 'New arrival',
        title: newest.title,
        image: newest.images?.[0],
        icon: aisleIcon(newest.categorySlug),
        href: `/product/${newest.slug}`,
      })
    }

    return out
  }, [products, categories, pages, config])

  if (!tiles.length) return null

  return (
    <div className="promo-mosaic">
      {tiles.map((t) => (
        <Link key={t.id} href={t.href} className={`promo-tile ${t.className}`}>
          {/* Photo when there is one; otherwise a large watermark glyph, so the
              tile is composed rather than half-empty. */}
          {t.image ? (
            <span className="promo-tile__media" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.image} alt="" />
            </span>
          ) : (
            <span className="promo-tile__glyph" aria-hidden="true">
              <i className={t.icon}></i>
            </span>
          )}

          <span className="promo-tile__body">
            {t.kicker && <span className="promo-tile__kicker">{t.kicker}</span>}
            {t.title && <span className="promo-tile__title">{t.title}</span>}

            {t.headline && (
              <span className="promo-tile__headline">
                {t.headline}
                {t.headlineNote && <small>{t.headlineNote}</small>}
              </span>
            )}

            <span className="promo-tile__cta">
              Shop now
              <i className="bx bx-right-arrow-alt"></i>
            </span>
          </span>
        </Link>
      ))}
    </div>
  )
}
