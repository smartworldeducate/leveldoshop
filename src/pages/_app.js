// pages/_app.js
import '../styles/globals.css'
import '../styles/sass/index.scss'
import '../assets/boxicons-2.0.7/css/boxicons.min.css'

import { Provider, useDispatch } from 'react-redux'
import { useEffect, useContext } from 'react'
import store from '../redux/store'
import Layout from '../components/Layout'
import { hydrate } from '../redux/shopping-cart/cartItemsSlide'

import { LoadingProvider, LoadingContext } from '../context/LoadingContext'
import Loader from '../components/Loader'

function HydrateCart({ Component, pageProps }) {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(hydrate())
  }, [dispatch])

  return <Component {...pageProps} />
}

function AppWrapper({ Component, pageProps }) {
  const { loading } = useContext(LoadingContext)

  return (
    <>
      {loading && <Loader />}
      <HydrateCart Component={Component} pageProps={pageProps} />
    </>
  )
}

function MyApp({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <LoadingProvider>
        <Layout>
          <AppWrapper Component={Component} pageProps={pageProps} />
        </Layout>
      </LoadingProvider>
    </Provider>
  )
}

export default MyApp
