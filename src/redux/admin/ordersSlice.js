// redux/admin/ordersSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebaseClient";

// Fetch orders from Firestore
export const fetchOrders = createAsyncThunk(
  "adminOrders/fetchOrders",
  async () => {
    const q = query(collection(db, "order"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    // Map each order
    const ordersArray = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return ordersArray;
  }
);

const ordersSlice = createSlice({
  name: "adminOrders",
  initialState: {
    items: [],
    status: "idle", // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export default ordersSlice.reducer;
