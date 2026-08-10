import { configureStore } from '@reduxjs/toolkit'
import productModalReducer from './product-modal/productModalSlice'
import cartItemsReducer from './shopping-cart/cartItemsSlide'
import productsReducer from './products/productsSlice'
import categoriesReducer from './categories/categoriesSlice'
import settingsReducer from './settings/settingsSlice'
import ordersReducer from './admin/ordersSlice'
import contactReducer from './contact/contactSlice'
import postReducer from './posts/postsSlice'

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
        contact: contactReducer,
        posts: postReducer,
    },
})

export default store
