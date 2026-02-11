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
import WhatsAppButton from '@/components/WhatsAppButton'

// ✅ Import AuthContext
import { AuthProvider } from '../context/AuthContext'

function HydrateCart({ children }) {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(hydrate())
  }, [dispatch])

  return children
}

function AppWrapper({ children }) {
  const { loading } = useContext(LoadingContext)

  return (
    <>
      {loading && <Loader />}
      {children}
    </>
  )
}

function MyApp({ Component, pageProps }) {
  // Layout system
  const getLayout =
    Component.getLayout ||
    ((page) => <Layout>{page}</Layout>)

  return (
    <Provider store={store}>
      <LoadingProvider>
        <AuthProvider> {/* ✅ Wrap with AuthProvider */}
          <HydrateCart>
            <AppWrapper>
              {getLayout(<Component {...pageProps} />)}
              <WhatsAppButton/>
            </AppWrapper>
          </HydrateCart>
        </AuthProvider>
      </LoadingProvider>
    </Provider>
  )
}

export default MyApp
