import React, { useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSelector } from 'react-redux'

import logo from '../assets/images/Logo-2.png'

const mainNav = [
  { display: 'Home', path: '/' },
  { display: 'Products', path: '/catalog' },
  { display: 'Accessories', path: '/accessories' },
  { display: 'Contact', path: '/contact' }
]

export default function Header() {
  const cartItems = useSelector((state) => state.cartItems.value)
  const pathname = usePathname()
  const activeNav = mainNav.findIndex((e) => e.path === pathname)

  const headerRef = useRef(null)
  const menuLeft = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      if (document.body.scrollTop > 80 || document.documentElement.scrollTop > 80) {
        headerRef.current?.classList.add('shrink')
      } else {
        headerRef.current?.classList.remove('shrink')
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const menuToggle = () => menuLeft.current.classList.toggle('active')

  return (
    <div className="header" ref={headerRef}>
      <div className="container">
        {/* Logo */}
        <div className="header__logo">
          <Link href="/" passHref>
            <Image src={logo} alt="Logo" width={150} height={50} />
          </Link>
        </div>

        {/* Menu */}
        <div className="header__menu">
          <div className="header__menu__mobile-toggle" onClick={menuToggle}>
            <i className="bx bx-menu-alt-left"></i>
          </div>

          <div className="header__menu__left" ref={menuLeft}>
            <div className="header__menu__left__close" onClick={menuToggle}>
              <i className="bx bx-chevron-left"></i>
            </div>
            {mainNav.map((item, index) => (
              <div
                key={index}
                className={`header__menu__item header__menu__left__item ${
                  index === activeNav ? 'active' : ''
                }`}
                onClick={menuToggle}
              >
                <Link href={item.path}>{item.display}</Link>
              </div>
            ))}
          </div>

          {/* Right Menu */}
    <div className="header__menu__right">
  <div className="header__menu__item header__menu__right__item">
    <i className="bx bx-search text-2xl"></i>
  </div>

  <div className="header__menu__item header__menu__right__item">
  <Link href="/cart">
    <div className="cart-icon-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
      <i className="bx bx-shopping-bag" style={{ fontSize: '24px' }}></i>

      {cartItems?.length > 0 && (
        <span
          className="cart-badge"
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            backgroundColor: '#f44336',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: '1',
          }}
        >
          {cartItems.length}
        </span>
      )}
    </div>
  </Link>
</div>


  <div className="header__menu__item header__menu__right__item">
    <i className="bx bx-user text-2xl"></i>
  </div>
</div>

        </div>
      </div>
    </div>
  )
}
