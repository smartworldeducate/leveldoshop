import React, { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSelector } from 'react-redux'
import { useAuth } from "../context/AuthContext";
import logo from '../assets/images/Logo-2.png'
import { useRouter } from 'next/router'
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebaseClient";
const mainNav = [
  { display: 'Home', path: '/' },
  { display: 'Products', path: '/catalog' },
  { display: 'Accessories', path: '/accessories' },
  { display: 'Contact', path: '/contact' },
  { display: 'Post', path: '/posts' }
]

export default function Header() {
  const router = useRouter()
  const { user } = useAuth();
const [open, setOpen] = useState(false);
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


  const handleLogout = async () => {
  try {
    await signOut(auth);
    router.push("/");
  } catch (error) {
    console.error("Logout error:", error);
  }
};


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
  {/* Search Icon */}
  <div className="header__menu__item header__menu__right__item">
    <i
      className="bx bx-search text-2xl"
      style={{ cursor: "pointer" }}
      onClick={() => router.push("/catalog?search=1")}
    ></i>
  </div>

  {/* Cart Icon */}
  <div className="header__menu__item header__menu__right__item">
    <Link href="/cart">
      <div
        className="cart-icon-wrapper"
        style={{ position: 'relative', display: 'inline-block' }}
      >
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

  {/* User Icon */}
  <div className="header__menu__item header__menu__right__item">
      {/* User Section */}
    <div className="header__menu__item header__menu__right__item">
      {user ? (
        <div style={{ position: "relative" }}>
          <div
            onClick={() => setOpen(!open)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="User"
                style={{
                  width: "25px",
                  height: "25px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <i className="bx bx-user-circle" style={{ fontSize: "24px" }}></i>
            )}
            <span
              style={{
                fontWeight: 500,
                fontSize: "15px",   // 👈 reduced
              }}
            >
              {user.displayName}
            </span>
          </div>

          {open && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "45px",
                background: "#fff",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                borderRadius: "8px",
                padding: "10px",
                minWidth: "150px",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  padding: "8px 10px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
                onClick={() => {
                  setOpen(false);
                  router.push("/admin/orders");
                }}
              >
                Admin
              </div>

              <div
                style={{
                  padding: "8px 10px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "#f44336",
                }}
                onClick={handleLogout}
              >
                Logout
              </div>
            </div>
          )}
        </div>
      ) : (
        <i
          className="bx bx-user text-2xl"
          style={{ cursor: "pointer" }}
          onClick={() => router.push("/login")}
        ></i>
      )}
    </div>
  </div>
</div>


        </div>
      </div>
    </div>
  )
}
