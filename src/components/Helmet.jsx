import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import Head from 'next/head'

const Helmet = ({ title, children }) => {
  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <Head>
        <title>{`Yolo - ${title}`}</title>
        {/* You can add meta tags here if needed */}
      </Head>
      <div>{children}</div>
    </>
  )
}

Helmet.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node
}

export default Helmet
