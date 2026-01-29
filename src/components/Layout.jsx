import React from 'react'
import Header from './Header'
import Footer from './Footer'
import ProductViewModal from './ProductViewModal'
import { useRouter } from 'next/router'
const Layout = ({ children }) => {
    const router = useRouter()
    const isAdminPage = router.pathname.startsWith('/admin')
  return (
    <>
     {!isAdminPage && <Header />}
      <div className="container">
        <main className="main">{children}</main>
      </div>
      <Footer />
      <ProductViewModal />
    </>
  )
}

export default Layout
