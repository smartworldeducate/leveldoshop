import { createSlice } from '@reduxjs/toolkit'

// ✅ Initial state is empty to avoid SSR issues
const initialState = {
  value: []
}

export const cartItemsSlice = createSlice({
  name: 'cartItems',
  initialState,
  reducers: {
    // Add item to cart
    addItem: (state, action) => {
      const newItem = action.payload

      // Check if the same item (slug + color + size) exists
      const duplicate = state.value.filter(
        e => e.slug === newItem.slug && e.color === newItem.color && e.size === newItem.size
      )

      if (duplicate.length > 0) {
        // Remove old duplicate
        state.value = state.value.filter(
          e => e.slug !== newItem.slug || e.color !== newItem.color || e.size !== newItem.size
        )

        // Add updated quantity
        state.value = [
          ...state.value,
          {
            id: duplicate[0].id,
            slug: newItem.slug,
            color: newItem.color,
            size: newItem.size,
            price: newItem.price,
            quantity: newItem.quantity + duplicate[0].quantity
          }
        ]
      } else {
        // Add as new item
        state.value = [
          ...state.value,
          {
            ...newItem,
            id: state.value.length > 0 ? state.value[state.value.length - 1].id + 1 : 1
          }
        ]
      }

      // Update localStorage only on the client
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'cartItems',
          JSON.stringify(
            state.value.sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0))
          )
        )
      }
    },

    // Update existing item
    updateItem: (state, action) => {
      const newItem = action.payload

      const item = state.value.filter(
        e => e.slug === newItem.slug && e.color === newItem.color && e.size === newItem.size
      )

      if (item.length > 0) {
        state.value = state.value.filter(
          e => e.slug !== newItem.slug || e.color !== newItem.color || e.size !== newItem.size
        )

        state.value = [
          ...state.value,
          {
            id: item[0].id,
            slug: newItem.slug,
            color: newItem.color,
            size: newItem.size,
            price: newItem.price,
            quantity: newItem.quantity
          }
        ]
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'cartItems',
          JSON.stringify(
            state.value.sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0))
          )
        )
      }
    },

    // Remove item from cart
    removeItem: (state, action) => {
      const item = action.payload
      state.value = state.value.filter(
        e => e.slug !== item.slug || e.color !== item.color || e.size !== item.size
      )

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'cartItems',
          JSON.stringify(
            state.value.sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0))
          )
        )
      }
    },

    // Hydrate cart from localStorage (client-side only)
    hydrate: (state) => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('cartItems')
        if (stored) {
          try {
            state.value = JSON.parse(stored)
          } catch {
            state.value = []
          }
        }
      }
    }
  }
})

// Export actions and reducer
export const { addItem, removeItem, updateItem, hydrate } = cartItemsSlice.actions
export default cartItemsSlice.reducer
