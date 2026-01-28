import React from 'react'
import Header from './Header'
import Footer from './Footer'
import ProductViewModal from './ProductViewModal'

const Layout = ({ children }) => {
  return (
    <>
      <Header />
      <div className="container">
        <main className="main">{children}</main>
      </div>
      <Footer />
      <ProductViewModal />
    </>
  )
}

export default Layout
