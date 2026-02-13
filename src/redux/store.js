import { configureStore } from '@reduxjs/toolkit'
import adminProductsReducer from './admin/productsSlice'
import productModalReducer from './product-modal/productModalSlice'
import cartItemsReducer from './shopping-cart/cartItemsSlide'
import productsReducer from './products/productsSlice'
import ordersReducer from "./admin/ordersSlice";
import contactReducer from "./contact/contactSlice";
import postReducer from "./posts/postsSlice";
import addProductsReducer from "./products/addProductsSlice";


const store = configureStore({
    reducer: {
        productModal: productModalReducer,
        cartItems: cartItemsReducer,
        products: productsReducer,
        adminProducts: adminProductsReducer,
        adminOrders: ordersReducer,
        contact: contactReducer,
        posts: postReducer,
        addProductState: addProductsReducer,
    },
})

export default store
