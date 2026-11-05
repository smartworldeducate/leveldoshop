import { configureStore } from '@reduxjs/toolkit'
import productModalReducer from './product-modal/productModalSlice'
import cartItemsReducer from './shopping-cart/cartItemsSlide'
import productsReducer from './products/productsSlice'
import categoriesReducer from './categories/categoriesSlice'
import settingsReducer from './settings/settingsSlice'
import ordersReducer from './admin/ordersSlice'
import postReducer from './posts/postsSlice'
import couponsReducer from './coupons/couponsSlice'
import couponSalesReducer from './couponSales/couponSalesSlice'
import rewardsReducer from './rewards/rewardsSlice'

// `products` is the one catalogue slice: the storefront reads it, the
// dashboard reads and writes it.
const store = configureStore({
    reducer: {
        productModal: productModalReducer,
        cartItems: cartItemsReducer,
        products: productsReducer,
        categories: categoriesReducer,
        settings: settingsReducer,
        adminOrders: ordersReducer,
        posts: postReducer,
        coupons: couponsReducer,
        couponSales: couponSalesReducer,
        rewards: rewardsReducer,
    },
    // Firestore timestamps are kept in the store on purpose (see lib/analytics),
    // so this check only filled the console with warnings on every page.
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
})

export default store
