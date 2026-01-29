import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebaseClient'

// Fetch all products
export const fetchProducts = createAsyncThunk('adminProducts/fetchProducts', async () => {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
})

// Add new product
export const addProduct = createAsyncThunk('adminProducts/addProduct', async (product) => {
  const { files, ...firestoreProduct } = product // remove files
  const docRef = await addDoc(collection(db, 'products'), {
    ...firestoreProduct,
    createdAt: serverTimestamp(),
  })
  return { id: docRef.id, ...firestoreProduct }
})

// Update product
export const updateProduct = createAsyncThunk('adminProducts/updateProduct', async ({ id, product }) => {
  const { files, ...firestoreProduct } = product // remove files
  await updateDoc(doc(db, 'products', id), firestoreProduct)
  return { id, ...firestoreProduct }
})

// Delete product
export const deleteProduct = createAsyncThunk('adminProducts/deleteProduct', async (id) => {
  await deleteDoc(doc(db, 'products', id))
  return id
})

const productsSlice = createSlice({
  name: 'adminProducts',
  initialState: {
    items: [],
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.items = action.payload
        state.status = 'succeeded'
      })
      .addCase(fetchProducts.pending, (state) => { state.status = 'loading' })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.items.findIndex(p => p.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p.id !== action.payload)
      })
  }
})

export default productsSlice.reducer
