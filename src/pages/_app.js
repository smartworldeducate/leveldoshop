// pages/_app.js
import '../styles/globals.css'
import '../styles/sass/index.scss'
import '../assets/boxicons-2.0.7/css/boxicons.min.css'

import { Provider, useDispatch } from 'react-redux'
import { useEffect, useContext } from 'react'
import { useRouter } from 'next/router'
import { Toaster } from 'react-hot-toast'
import store from '../redux/store'
import Layout from '../components/Layout'
import { hydrate } from '../redux/shopping-cart/cartItemsSlide'
import { fetchCategories } from '../redux/categories/categoriesSlice'
import { fetchSettings } from '../redux/settings/settingsSlice'
import { fetchDraws } from '../redux/rewards/rewardsSlice'
import { fetchOffers } from '../redux/couponSales/couponSalesSlice'

import { LoadingProvider, LoadingContext } from '../context/LoadingContext'
import Loader from '../components/Loader'
import WhatsAppButton from '@/components/WhatsAppButton'

import { AuthProvider } from '../context/AuthContext'
import useInspectGuard from '../lib/useInspectGuard'

/**
 * One bootstrap for data both halves of the app need on every route: the
 * basket from localStorage, plus the aisles and storefront settings that the
 * shopkeeper controls from the dashboard.
 */
function Bootstrap({ children }) {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(hydrate())
    dispatch(fetchCategories())
    dispatch(fetchSettings())
    dispatch(fetchDraws())
    dispatch(fetchOffers())
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
  const router = useRouter()
  useInspectGuard()
  // The back-office runs its own chrome — no storefront shell, no shop widgets.
  const isDashboard = router.pathname.startsWith('/dashboard')

  const getLayout =
    Component.getLayout ||
    ((page) => <Layout>{page}</Layout>)

  return (
    <Provider store={store}>
      <LoadingProvider>
        <AuthProvider>
          <Bootstrap>
            <AppWrapper>
              {getLayout(<Component {...pageProps} />)}
              {!isDashboard && <WhatsAppButton />}
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    borderRadius: '14px',
                    background: '#1E2033',
                    color: '#fff',
                    fontSize: '14px',
                  },
                }}
              />
            </AppWrapper>
          </Bootstrap>
        </AuthProvider>
      </LoadingProvider>
    </Provider>
  )
}

export default MyApp
