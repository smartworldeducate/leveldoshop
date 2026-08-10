import { createSlice } from '@reduxjs/toolkit'

// Groceries have no variants, so a cart line is identified by its product
// slug alone — adding the same item twice bumps the quantity.
const initialState = {
  value: []
}

const persist = (items) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cartItems', JSON.stringify(items))
  }
}

export const cartItemsSlice = createSlice({
  name: 'cartItems',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const newItem = action.payload
      const existing = state.value.find(e => e.slug === newItem.slug)

      if (existing) {
        existing.quantity += Number(newItem.quantity) || 1
        existing.price = Number(newItem.price) || existing.price
      } else {
        state.value.push({
          id: state.value.length ? state.value[state.value.length - 1].id + 1 : 1,
          slug: newItem.slug,
          price: Number(newItem.price) || 0,
          quantity: Number(newItem.quantity) || 1
        })
      }

      persist(state.value)
    },

    updateItem: (state, action) => {
      const newItem = action.payload
      const item = state.value.find(e => e.slug === newItem.slug)

      if (item) {
        item.quantity = Math.max(1, Number(newItem.quantity) || 1)
        item.price = Number(newItem.price) || item.price
      }

      persist(state.value)
    },

    removeItem: (state, action) => {
      state.value = state.value.filter(e => e.slug !== action.payload.slug)
      persist(state.value)
    },

    clearCart: (state) => {
      state.value = []
      persist(state.value)
    },

    // Hydrate from localStorage (client-side only)
    hydrate: (state) => {
      if (typeof window === 'undefined') return
      const stored = localStorage.getItem('cartItems')
      if (!stored) return
      try {
        const parsed = JSON.parse(stored)
        // Baskets saved before the grocery change carried colour/size keys and
        // could hold the same slug twice — merge those lines on the way in.
        state.value = parsed.reduce((acc, item) => {
          const existing = acc.find(e => e.slug === item.slug)
          if (existing) {
            existing.quantity += Number(item.quantity) || 1
          } else {
            acc.push({
              id: acc.length + 1,
              slug: item.slug,
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1
            })
          }
          return acc
        }, [])
      } catch {
        state.value = []
      }
    }
  }
})

export const { addItem, removeItem, updateItem, clearCart, hydrate } = cartItemsSlice.actions
export default cartItemsSlice.reducer
