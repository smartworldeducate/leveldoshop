import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebaseClient'

export const sendContactMessage = createAsyncThunk(
  'contact/send',
  async (formData, { rejectWithValue }) => {
    try {
      await addDoc(collection(db, 'contactMessages'), {
        ...formData,
        createdAt: serverTimestamp()
      })
      return true
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const contactSlice = createSlice({
  name: 'contact',
  initialState: {
    loading: false,
    success: false,
    error: null
  },
  reducers: {
    resetContactState: (state) => {
      state.loading = false
      state.success = false
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendContactMessage.pending, (state) => {
        state.loading = true
        state.success = false
      })
      .addCase(sendContactMessage.fulfilled, (state) => {
        state.loading = false
        state.success = true
      })
      .addCase(sendContactMessage.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  }
})

export const { resetContactState } = contactSlice.actions
export default contactSlice.reducer
