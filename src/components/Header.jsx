import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector } from 'react-redux'
import { signOut } from 'firebase/auth'

import { useAuth } from '../context/AuthContext'
import { auth } from '../lib/firebaseClient'
import { isAdmin } from '../lib/admins'
import { visibleCategories } from '../data/grocery'

// `page` maps a link to its settings key; links without one are always shown.
const mainNav = [
  { display: 'Home', path: '/' },
  { display: 'Shop', path: '/catalog' },
  { display: 'Deals', path: '/deals', page: 'deals' },
  { display: 'Blog', path: '/posts', page: 'posts' },
  { display: 'Contact', path: '/contact', page: 'contact' }
]

export default function Header() {
  const router = useRouter()
  const { user } = useAuth()
  const cartItems = useSelector((state) => state.cartItems.value)
  const categories = useSelector((state) => state.categories.items)
  const pages = useSelector((state) => state.settings.values.pages)

  const aisles = visibleCategories(categories)
  // A page switched off in the dashboard loses its link here too.
  const nav = mainNav.filter((item) => !item.page || pages?.[item.page] !== false)

  const [term, setTerm] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)

  // Basket count is units, not lines — "3" should mean three things to carry.
  const cartCount = cartItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)

  // Close the drawer whenever the route changes, or it hangs over the new page.
  useEffect(() => {
    setMenuOpen(false)
    setAccountOpen(false)
  }, [router.asPath])

  useEffect(() => {
    const onClickAway = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  const submitSearch = (e) => {
    e.preventDefault()
    router.push(term.trim() ? `/catalog?q=${encodeURIComponent(term.trim())}` : '/catalog')
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <div className="container site-header__inner">
          <button
            type="button"
            className="site-header__burger"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <i className="bx bx-menu"></i>
          </button>

          <Link href="/" className="brand">
            <span className="brand__mark">
              <i className="bx bx-basket"></i>
            </span>
            <span className="brand__text">
              <strong>Leveldo</strong>
              <small>grocery</small>
            </span>
          </Link>

          <form className="site-search" onSubmit={submitSearch} role="search">
            <i className="bx bx-search"></i>
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search for milk, bananas, bread…"
              aria-label="Search groceries"
            />
            <button type="submit">Search</button>
          </form>

          <nav className="site-header__links">
            {nav.slice(1).map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={router.pathname === item.path ? 'is-active' : ''}
              >
                {item.display}
              </Link>
            ))}
          </nav>

          <div className="site-header__actions">
            <Link href="/catalog?search=1" className="site-header__icon site-header__icon--search" aria-label="Search">
              <i className="bx bx-search"></i>
            </Link>

            <div className="site-header__account" ref={accountRef}>
              {user ? (
                <>
                  <button
                    type="button"
                    className="site-header__icon"
                    onClick={() => setAccountOpen((v) => !v)}
                    aria-label="Account menu"
                  >
                    {user.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.photoURL} alt="" className="site-header__avatar" />
                    ) : (
                      <i className="bx bx-user-circle"></i>
                    )}
                    <span className="site-header__icon__label">
                      {(user.displayName || user.email || '').split(' ')[0]}
                    </span>
                  </button>

                  {accountOpen && (
                    <div className="account-menu">
                      {isAdmin(user) && <Link href="/dashboard">Dashboard</Link>}
                      <Link href="/posts">Blog</Link>
                      <button type="button" onClick={handleLogout}>Log out</button>
                    </div>
                  )}
                </>
              ) : (
                <Link href="/login" className="site-header__icon" aria-label="Sign in">
                  <i className="bx bx-user"></i>
                  <span className="site-header__icon__label">Sign in</span>
                </Link>
              )}
            </div>

            <Link href="/cart" className="site-header__cart" aria-label="Basket">
              <i className="bx bx-shopping-bag"></i>
              {cartCount > 0 && <span className="site-header__cart__badge">{cartCount}</span>}
            </Link>
          </div>
        </div>
      </div>

      {/* mobile drawer */}
      <div className={`site-drawer ${menuOpen ? 'is-open' : ''}`}>
        <div className="site-drawer__scrim" onClick={() => setMenuOpen(false)} />
        <div className="site-drawer__panel">
          <div className="site-drawer__head">
            <span className="brand__text">
              <strong>Leveldo</strong>
              <small>grocery</small>
            </span>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <i className="bx bx-x"></i>
            </button>
          </div>

          <nav className="site-drawer__nav">
            {nav.map((item) => (
              <Link key={item.path} href={item.path} className={router.pathname === item.path ? 'is-active' : ''}>
                {item.display}
              </Link>
            ))}
          </nav>

          {aisles.length > 0 && (
            <>
              <p className="site-drawer__label">Aisles</p>
              <nav className="site-drawer__aisles">
                {aisles.map((c) => (
                  <Link key={c.slug} href={`/catalog?category=${c.slug}`}>
                    <span className="aisle-bar__dot" style={{ backgroundColor: c.accent }} />
                    {c.name}
                  </Link>
                ))}
              </nav>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
