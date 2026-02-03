import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  runTransaction,
} from "firebase/firestore";
import { db } from "../../lib/firebaseClient";

/* ============================
   FETCH ORDERS
   ============================ */
export const fetchOrders = createAsyncThunk(
  "adminOrders/fetchOrders",
  async () => {
    const q = query(
      collection(db, "order"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }
);

/* ============================
   TOGGLE STATUS + UPDATE STOCK
   ============================ */
export const toggleOrderStatus = createAsyncThunk(
  "adminOrders/toggleOrderStatus",
  async (order, { rejectWithValue }) => {
    try {
      const isCompleting = order.status !== "completed";

      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, "order", order.id);

        // READ FIRST
        const productReads = [];

        if (isCompleting) {
          for (const item of order.cartItems || []) {
            const productRef = doc(db, "products", item.productId);
            const snap = await transaction.get(productRef);

            if (!snap.exists()) {
              throw new Error("Product not found");
            }

            productReads.push({
              ref: productRef,
              snap,
              qty: item.quantity,
              title: item.title,
            });
          }
        }

        // VALIDATE
        for (const p of productReads) {
          const stock = p.snap.data().stock ?? 0;
          if (stock < p.qty) {
            throw new Error(`Insufficient stock for ${p.title}`);
          }
        }

        // WRITE
        for (const p of productReads) {
          const stock = p.snap.data().stock ?? 0;
          transaction.update(p.ref, {
            stock: stock - p.qty,
          });
        }

        transaction.update(orderRef, {
          status: isCompleting ? "completed" : "pending",
          completedAt: isCompleting ? new Date() : null,
        });
      });

      return {
        id: order.id,
        status: isCompleting ? "completed" : "pending",
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/* ============================
   DELETE ORDER
   ============================ */
export const deleteOrder = createAsyncThunk(
  "adminOrders/deleteOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      await deleteDoc(doc(db, "order", orderId));
      return orderId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/* ============================
   SLICE
   ============================ */
const ordersSlice = createSlice({
  name: "adminOrders",
  initialState: {
    items: [],
    status: "idle", // idle | loading | succeeded | failed
    processingId: null,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder

      // FETCH
      .addCase(fetchOrders.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })

      // TOGGLE STATUS
      .addCase(toggleOrderStatus.pending, (state, action) => {
        state.processingId = action.meta.arg.id;
      })
      .addCase(toggleOrderStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        state.processingId = null;

        const order = state.items.find((o) => o.id === id);
        if (order) order.status = status;
      })
      .addCase(toggleOrderStatus.rejected, (state, action) => {
        state.processingId = null;
        state.error = action.payload;
      })

      // DELETE
      .addCase(deleteOrder.pending, (state, action) => {
        state.processingId = action.meta.arg;
      })
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.processingId = null;
        state.items = state.items.filter(
          (o) => o.id !== action.payload
        );
      })
      .addCase(deleteOrder.rejected, (state, action) => {
        state.processingId = null;
        state.error = action.payload;
      });
  },
});

export default ordersSlice.reducer;
