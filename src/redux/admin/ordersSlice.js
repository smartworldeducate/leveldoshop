import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  runTransaction,
  getDoc,
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
   COMPLETE ORDER + REDUCE STOCK
============================ */
export const toggleOrderStatus = createAsyncThunk(
  "adminOrders/toggleOrderStatus",
  async (order, { rejectWithValue }) => {
    try {
      // Only allow completion once
      if (order.status === "completed") {
        return rejectWithValue("Order already completed");
      }

      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, "order", order.id);

        // 1️⃣ READ + VALIDATE STOCK
        for (const item of order.cartItems || []) {
          const productRef = doc(db, "products", item.productId);
          const productSnap = await transaction.get(productRef);

          if (!productSnap.exists()) {
            throw new Error("Product not found");
          }

          const stock = productSnap.data().stock ?? 0;

          if (stock < item.quantity) {
            throw new Error(
              `Insufficient stock for ${item.title}`
            );
          }

          // 2️⃣ REDUCE STOCK
          transaction.update(productRef, {
            stock: stock - item.quantity,
          });
        }

        // 3️⃣ UPDATE ORDER STATUS
        transaction.update(orderRef, {
          status: "completed",
          completedAt: new Date(),
        });
      });

      return {
        id: order.id,
        status: "completed",
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/* ============================
   DELETE ORDER + RESTORE STOCK
============================ */
export const deleteOrder = createAsyncThunk(
  "adminOrders/deleteOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      const orderRef = doc(db, "order", orderId);
      const orderSnap = await getDoc(orderRef);

      if (!orderSnap.exists()) {
        throw new Error("Order not found");
      }

      const order = orderSnap.data();

      await runTransaction(db, async (transaction) => {
        // 1️⃣ RESTORE STOCK (ONLY IF COMPLETED)
        if (order.status === "completed") {
          for (const item of order.cartItems || []) {
            const productRef = doc(db, "products", item.productId);
            const productSnap = await transaction.get(productRef);

            if (!productSnap.exists()) continue;

            const stock = productSnap.data().stock ?? 0;

            transaction.update(productRef, {
              stock: stock + item.quantity,
            });
          }
        }

        // 2️⃣ DELETE ORDER
        transaction.delete(orderRef);
      });

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
    status: "idle",
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

      // COMPLETE ORDER
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
