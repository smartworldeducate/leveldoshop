import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSelector } from 'react-redux'

import { discountPercent, formatMoney, isSellable, packLabel, visibleCategories } from '../data/grocery'
import { DEFAULT_HOME, orDefault } from '../data/home'

/** Up to three photographed products, starting at `from` so slides differ. */
const pickArt = (products, from) => {
  const withPhoto = products.filter((p) => p.images?.[0])
  if (!withPhoto.length) return []
  const start = from % withPhoto.length
  return [...withPhoto.slice(start), ...withPhoto.slice(0, start)].slice(0, 3)
}

/** "4pm" / "16:30" / "16" → minutes past midnight, or null if unreadable. */
function parseCutoff(value) {
  const m = String(value || '').trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!m) return null
  let hour = Number(m[1])
  const mins = Number(m[2] || 0)
  if (m[3] === 'pm' && hour < 12) hour += 12
  if (m[3] === 'am' && hour === 12) hour = 0
  if (hour > 23 || mins > 59) return null
  return hour * 60 + mins
}

/**
 * Editorial split hero: an offer headline on the left, the shop's own goods on
 * the right, numbered slides with arrows underneath. Every slide is built from
 * what the shop actually has in stock — no slide claims a discount that isn't
 * real, and the countdown only appears while same-day ordering is still open.
 */
export default function MarketHero() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const stage = useRef(null)

  const { tagline, contact, pages, home } = useSelector((state) => state.settings.values)
  const products = useSelector((state) => state.products.items)
  const categories = useSelector((state) => state.categories.items)

  const sellable = useMemo(() => products.filter(isSellable), [products])
  const cutoff = contact?.orderCutoff || '4pm'
  const heroContent = home?.hero || DEFAULT_HOME.hero
  const autoplayMs = Number(heroContent.autoplayMs) > 0 ? Number(heroContent.autoplayMs) : 7000

  // Time left to order for same-day delivery. Client-only: rendering a clock on
  // the server would hydrate against a different minute.
  useEffect(() => {
    const target = parseCutoff(cutoff)
    if (target === null) return undefined

    const tick = () => {
      const now = new Date()
      const left = target - (now.getHours() * 60 + now.getMinutes())
      setCountdown(left > 0 ? left : null)
    }

    tick()
    const timer = setInterval(tick, 30_000)
    return () => clearInterval(timer)
  }, [cutoff])

  const slides = useMemo(() => {
    const aisles = visibleCategories(categories)
    const dealsHref = pages?.deals === false ? '/catalog' : '/deals'
    const produce = aisles.find((c) => c.slug === 'fruits-vegetables') || aisles[0]

    // Biggest genuine markdown on the shelf right now.
    const bestPct = sellable.reduce((top, p) => Math.max(top, discountPercent(p) || 0), 0)

    const list = []

    // The deal slide is generated, not written: it states a real percentage or
    // it does not appear at all.
    if (heroContent.autoDeal !== false && bestPct >= 5) {
      list.push({
        id: 'auto-deal',
        kicker: 'Limited time only',
        display: `${bestPct}% OFF`,
        script: 'Weekly market prices*',
        lead: 'Marked-down produce, pantry staples and use-it-soon bakery — reduced while stock lasts.',
        cta: 'Shop the deals',
        href: dealsHref,
        image: '',
      })
    }

    const authored = (heroContent.slides || []).filter(
      (slide) => orDefault(slide.display, '') || orDefault(slide.script, '')
    )

    authored.forEach((slide, i) => {
      // `{aisle}` lets a slide name the first aisle without hardcoding it.
      const fill = (text) => String(text || '').replace(/\{aisle\}/g, produce?.name?.toLowerCase() || 'the aisles')

      list.push({
        id: slide.id || `slide-${i}`,
        kicker: fill(slide.kicker),
        countdown: slide.countdown === true,
        display: fill(slide.display),
        script: fill(slide.script),
        lead: fill(slide.lead),
        cta: orDefault(fill(slide.ctaLabel), 'Shop now'),
        href: orDefault(slide.ctaHref, '/catalog'),
        image: slide.image || '',
      })
    })

    // A shopkeeper who deletes every slide still gets a working hero.
    if (!list.length) {
      list.push({
        id: 'fallback',
        kicker: tagline || `Order by ${cutoff}`,
        countdown: true,
        display: 'Same day',
        script: 'Picked this morning, on your table tonight',
        lead: '',
        cta: 'Start shopping',
        href: '/catalog',
        image: '',
      })
    }

    return list.map((slide, i) => ({ ...slide, art: pickArt(sellable, i) }))
  }, [sellable, categories, heroContent, tagline, cutoff, pages])

  // A slide count that shrinks (the last deal sells out) must not strand the
  // index on a slide that no longer exists.
  const active = index % slides.length
  const slide = slides[active]

  const go = (next) => setIndex((next + slides.length) % slides.length)

  useEffect(() => {
    if (paused || slides.length < 2) return undefined
    const timer = setTimeout(() => setIndex((i) => (i + 1) % slides.length), autoplayMs)
    return () => clearTimeout(timer)
  }, [active, paused, slides.length, autoplayMs])

  // Basket preview: one product from each of the first aisles rather than the
  // three newest, which tended to come from the same corner of the shop.
  const preview = useMemo(() => {
    const picked = []
    for (const c of visibleCategories(categories)) {
      const item = sellable.find((p) => p.categorySlug === c.slug)
      if (item) picked.push(item)
      if (picked.length === 3) break
    }
    return picked.length ? picked : sellable.slice(0, 3)
  }, [sellable, categories])
  const previewTotal = preview.reduce((sum, p) => sum + (Number(p.price) || 0), 0)

  const countdownLabel =
    countdown === null
      ? null
      : countdown >= 60
      ? `${Math.floor(countdown / 60)}h ${countdown % 60}m left to order for today`
      : `${countdown}m left to order for today`

  // Pointer parallax, in CSS custom properties so the animation stays on the
  // compositor. Ignored on touch, where there is no pointer to follow.
  const onMove = (e) => {
    const el = stage.current
    if (!el) return
    const box = el.getBoundingClientRect()
    el.style.setProperty('--px', ((e.clientX - box.left) / box.width - 0.5).toFixed(3))
    el.style.setProperty('--py', ((e.clientY - box.top) / box.height - 0.5).toFixed(3))
  }

  const resetMove = () => {
    stage.current?.style.setProperty('--px', 0)
    stage.current?.style.setProperty('--py', 0)
  }

  return (
    <section
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false)
        resetMove()
      }}
      onMouseMove={onMove}
    >
      {/* key restarts the entrance animation whenever the slide changes */}
      <div className="hero__copy" key={`copy-${slide.id}`}>
        <span className={`hero__kicker ${slide.countdown && countdownLabel ? 'is-live' : ''}`}>
          {slide.countdown && countdownLabel ? (
            <>
              <span className="hero__pulse" aria-hidden="true" />
              {countdownLabel}
            </>
          ) : (
            slide.kicker
          )}
        </span>

        <h1 className="hero__display">{slide.display}</h1>
        <p className="hero__script">{slide.script}</p>
        <p className="hero__lead">{slide.lead}</p>

        <div className="hero__actions">
          <Link href={slide.href} className="hero__cta">
            {slide.cta}
            <i className="bx bx-right-arrow-alt"></i>
          </Link>

          {pages?.deals !== false && slides[0]?.id === 'auto-deal' && slide.id !== 'auto-deal' && (
            <Link href="/deals" className="hero__ghost">
              See this week&apos;s deals
            </Link>
          )}
        </div>

        {slides.length > 1 && (
          <div className="hero__controls">
            <div className="hero__dots" role="tablist" aria-label="Hero slides">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={s.display}
                  className={`hero__dot ${i === active ? 'is-active' : ''}`}
                  onClick={() => setIndex(i)}
                >
                  <span className="hero__dot__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="hero__dot__track">
                    {/* The fill runs the length of the autoplay delay, so the
                        indicator doubles as a progress bar. */}
                    <span
                      className="hero__dot__fill"
                      style={{
                        animationDuration: `${autoplayMs}ms`,
                        animationPlayState: paused ? 'paused' : 'running',
                      }}
                    />
                  </span>
                </button>
              ))}
            </div>

            <div className="hero__arrows">
              <button type="button" onClick={() => go(active - 1)} aria-label="Previous slide">
                <i className="bx bx-chevron-left"></i>
              </button>
              <button type="button" onClick={() => go(active + 1)} aria-label="Next slide">
                <i className="bx bx-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="hero__art" ref={stage} key={`art-${slide.id}`}>
        <span className="hero__art__disc" aria-hidden="true" />

        {slide.image ? (
          <span className="hero__art__banner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image} alt="" />
          </span>
        ) : slide.art.length ? (
          <>
            <Link href={`/product/${slide.art[0].slug}`} className="hero__art__main">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.art[0].images[0]} alt={slide.art[0].title} />
            </Link>

            {slide.art.slice(1).map((p, i) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className={`hero__art__chip hero__art__chip--${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0]} alt={p.title} />
              </Link>
            ))}
          </>
        ) : (
          // No photography yet: show the thing being sold — a basket, priced.
          <div className="hero__panel">
            <div className="hero__panel__head">
              {/* No icon here: the delivery badge already sits in this corner */}
              <span>
                <strong>Today&apos;s basket</strong>
                <small>{sellable.length} products in stock</small>
              </span>
            </div>

            <ul className="hero__panel__list">
              {preview.map((p) => (
                <li key={p.id}>
                  <span className="hero__panel__mark" aria-hidden="true" />
                  <span className="hero__panel__name">
                    <strong>{p.title}</strong>
                    <small>{packLabel(p)}</small>
                  </span>
                  <span className="hero__panel__price">{formatMoney(p.price)}</span>
                </li>
              ))}
            </ul>

            <div className="hero__panel__foot">
              <span>Subtotal</span>
              <strong>{formatMoney(previewTotal)}</strong>
            </div>

            <div className="hero__badge hero__badge--eta">
              <i className="bx bx-cycling"></i>
              <span>
                <strong>Delivered today</strong>
                <small>Order by {cutoff}</small>
              </span>
            </div>

            <div className="hero__badge hero__badge--trust">
              <i className="bx bx-check-shield"></i>
              <span>
                <strong>Freshness promise</strong>
                <small>Not fresh? Replaced</small>
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
