import {
  createSlice,
  createAsyncThunk,
  isFulfilled,
  isPending,
  isRejected,
} from "@reduxjs/toolkit";
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
import { auth, db } from "../../lib/firebaseClient";
import {
  advanceReturn,
  buildReturn,
  customerReturnBlock,
  ownsOrder,
  refundableLeft,
  restockTotals,
  restockedByLine,
  returnsOf,
} from "../../data/returns";
import {
  advanceOrder,
  deliveredQty,
  issuesOf,
  reportIssue,
  resolveIssue,
} from "../../data/fulfilment";

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

/**
 * Read every product in a basket inside a transaction, one row per product.
 * `quantityOf(item, line)` says how many units of a basket line count.
 */
const readBasket = async (
  transaction,
  cartItems = [],
  quantityOf = (item) => item.quantity
) => {
  const byProduct = new Map();
  cartItems.forEach((item, line) => {
    const row = byProduct.get(item.productId) || {
      productId: item.productId,
      title: item.title,
      quantity: 0,
    };
    row.quantity += quantityOf(item, line);
    byProduct.set(item.productId, row);
  });

  return Promise.all(
    [...byProduct.values()].map(async (row) => {
      const ref = doc(db, "products", row.productId);
      return { ...row, ref, snap: await transaction.get(ref) };
    })
  );
};

/* ============================
   FULFILMENT
============================ */
const actor = () => auth.currentUser?.email || "";

/** Move an order one step along; reaching "delivered" takes its units out of stock. */
export const advanceOrderStage = createAsyncThunk(
  "adminOrders/advanceOrderStage",
  async ({ orderId }, { rejectWithValue }) => {
    try {
      const orderRef = doc(db, "order", orderId);
      const patch = await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Order not found");

        const order = orderSnap.data();
        const next = advanceOrder(order, { at: new Date().toISOString(), by: actor() });

        // Firestore wants every read done before the first write, so the whole
        // basket is read and checked first.
        if (next.stage === "delivered") {
          const lines = await readBasket(transaction, order.cartItems, (_, line) => deliveredQty(order, line));

          for (const { snap, quantity, title } of lines) {
            if (!snap.exists()) throw new Error("Product not found");
            if ((snap.data().stock ?? 0) < quantity) {
              throw new Error(`Insufficient stock for ${title}`);
            }
          }

          for (const { ref, snap, quantity } of lines) {
            transaction.update(ref, { stock: (snap.data().stock ?? 0) - quantity });
          }
        }

        transaction.update(orderRef, next.patch);
        return next.patch;
      });
      return { orderId, patch };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const reportOrderIssue = createAsyncThunk(
  "adminOrders/reportOrderIssue",
  async ({ orderId, type, note, selection }, { rejectWithValue }) => {
    try {
      const orderRef = doc(db, "order", orderId);
      const patch = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(orderRef);
        if (!snap.exists()) throw new Error("Order not found");

        const order = snap.data();
        const issue = reportIssue(
          order,
          { type, note, selection },
          { id: doc(collection(db, "order")).id, at: new Date().toISOString(), by: actor() }
        );
        const next = { issues: [...issuesOf(order), issue] };
        transaction.update(orderRef, next);
        return next;
      });
      return { orderId, patch };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const resolveOrderIssue = createAsyncThunk(
  "adminOrders/resolveOrderIssue",
  async ({ orderId, issueId, resolution, note }, { rejectWithValue }) => {
    try {
      const orderRef = doc(db, "order", orderId);
      const patch = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(orderRef);
        if (!snap.exists()) throw new Error("Order not found");

        const result = resolveIssue(
          snap.data(),
          issueId,
          { resolution, note },
          { at: new Date().toISOString(), by: actor() }
        );

        const products = await Promise.all(
          Object.keys(result.writeOff).map(async (id) => {
            const ref = doc(db, "products", id);
            return { id, ref, snap: await transaction.get(ref) };
          })
        );
        products.forEach(({ id, ref, snap: productSnap }) => {
          if (!productSnap.exists()) return;
          const stock = productSnap.data().stock ?? 0;
          transaction.update(ref, { stock: Math.max(0, stock - result.writeOff[id]) });
        });

        transaction.update(orderRef, result.patch);
        return result.patch;
      });
      return { orderId, patch };
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
      // Units a return already put back must not be restored a second time.
      const restocked = restockedByLine(order);

      await runTransaction(db, async (transaction) => {
        // 1️⃣ RESTORE STOCK (ONLY IF COMPLETED)
        if (order.status === "completed") {
          const lines = await readBasket(
            transaction,
            order.cartItems,
            (_, line) => deliveredQty(order, line) - (restocked[line] || 0)
          );

          for (const { ref, snap, quantity } of lines) {
            if (!snap.exists()) continue;

            transaction.update(ref, {
              stock: (snap.data().stock ?? 0) + quantity,
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
   CUSTOMER UPDATES
============================ */
const saveUpdateRecord = (orderId, eventKey, change) => {
  const orderRef = doc(db, "order", orderId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists()) throw new Error("Order not found");

    const notifications = snap.data().notifications || {};
    const next = { ...notifications, [eventKey]: { ...notifications[eventKey], ...change } };
    transaction.update(orderRef, { notifications: next });
    return { notifications: next };
  });
};

/**
 * Email the customer about an order event, and note how it went on the order.
 * A failed email never undoes the step itself: it only shows up on the order
 * page, where staff can retry or use WhatsApp.
 */
export const notifyCustomer = createAsyncThunk(
  "adminOrders/notifyCustomer",
  async ({ orderId, eventKey, resend = false }) => {
    let email;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/notify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, eventKey, resend }),
      });
      const result = await res.json().catch(() => ({}));
      if (result.skipped) return { orderId, patch: null };
      email = res.ok
        ? { status: "sent", at: new Date().toISOString() }
        : { status: "failed", reason: result.reason || "send_failed", at: new Date().toISOString() };
    } catch {
      email = { status: "failed", reason: "send_failed", at: new Date().toISOString() };
    }
    return { orderId, patch: await saveUpdateRecord(orderId, eventKey, { email }) };
  }
);

/** WhatsApp is sent by hand, so all we can record is that staff opened it. */
export const recordWhatsappUpdate = createAsyncThunk(
  "adminOrders/recordWhatsappUpdate",
  async ({ orderId, eventKey }) => ({
    orderId,
    patch: await saveUpdateRecord(orderId, eventKey, {
      whatsapp: { at: new Date().toISOString(), by: actor() },
    }),
  })
);

/* ============================
   RETURNS
============================ */
export const createReturn = createAsyncThunk(
  "adminOrders/createReturn",
  async ({ orderId, selection, reason, note, source = "staff", settings }, { rejectWithValue }) => {
    try {
      const orderRef = doc(db, "order", orderId);
      const returns = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(orderRef);
        if (!snap.exists()) throw new Error("Order not found");

        const order = snap.data();

        // Shoppers are held to their own orders and the store's return window.
        if (source === "customer") {
          if (!ownsOrder(order, auth.currentUser)) throw new Error("This order isn't on your account");
          if (customerReturnBlock(order, settings) === "expired") {
            throw new Error("The return window for this order has closed");
          }
          if (customerReturnBlock(order, settings) === "disabled") {
            throw new Error("Returns can't be requested online right now");
          }
        }

        const ret = buildReturn(
          order,
          { selection, reason, note, source },
          { id: doc(collection(db, "order")).id, at: new Date().toISOString(), by: actor() }
        );
        const next = [...returnsOf(order), ret];
        transaction.update(orderRef, { returns: next });
        return next;
      });
      return { orderId, returns };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/** approve / reject / receive (puts stock back) / refund — see data/returns.js. */
export const updateReturn = createAsyncThunk(
  "adminOrders/updateReturn",
  async ({ orderId, returnId, action, payload }, { rejectWithValue }) => {
    try {
      const orderRef = doc(db, "order", orderId);
      const returns = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(orderRef);
        if (!snap.exists()) throw new Error("Order not found");

        const order = snap.data();
        const ret = returnsOf(order).find((r) => r.id === returnId);
        if (!ret) throw new Error("Return not found");

        const updated = advanceReturn(ret, action, payload, {
          at: new Date().toISOString(),
          by: actor(),
          refundCap: refundableLeft(order),
        });

        // Firestore wants every read done before the first write.
        const totals = action === "receive" ? restockTotals(updated) : {};
        const products = await Promise.all(
          Object.keys(totals).map(async (id) => {
            const ref = doc(db, "products", id);
            return { id, ref, snap: await transaction.get(ref) };
          })
        );

        products.forEach(({ id, ref, snap: productSnap }) => {
          if (productSnap.exists()) {
            transaction.update(ref, { stock: (productSnap.data().stock ?? 0) + totals[id] });
          } else {
            // Product deleted since the sale: nothing to put back on.
            updated.items = updated.items.map((i) =>
              i.productId === id ? { ...i, restocked: 0 } : i
            );
          }
        });

        const next = returnsOf(order).map((r) => (r.id === returnId ? updated : r));
        transaction.update(orderRef, { returns: next });
        return next;
      });
      return { orderId, returns };
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
      })

      // CUSTOMER UPDATES
      .addMatcher(isFulfilled(notifyCustomer, recordWhatsappUpdate), (state, action) => {
        const { orderId, patch } = action.payload;
        const order = state.items.find((o) => o.id === orderId);
        if (order && patch) Object.assign(order, patch);
      })

      // FULFILMENT
      .addMatcher(isPending(advanceOrderStage, reportOrderIssue, resolveOrderIssue), (state, action) => {
        state.processingId = action.meta.arg.orderId;
      })
      .addMatcher(isFulfilled(advanceOrderStage, reportOrderIssue, resolveOrderIssue), (state, action) => {
        const { orderId, patch } = action.payload;
        state.processingId = null;

        const order = state.items.find((o) => o.id === orderId);
        if (order) Object.assign(order, patch);
      })
      .addMatcher(isRejected(advanceOrderStage, reportOrderIssue, resolveOrderIssue), (state, action) => {
        state.processingId = null;
        state.error = action.payload;
      })

      // RETURNS
      .addMatcher(isPending(createReturn, updateReturn), (state, action) => {
        state.processingId = action.meta.arg.orderId;
      })
      .addMatcher(isFulfilled(createReturn, updateReturn), (state, action) => {
        const { orderId, returns } = action.payload;
        state.processingId = null;

        const order = state.items.find((o) => o.id === orderId);
        if (order) order.returns = returns;
      })
      .addMatcher(isRejected(createReturn, updateReturn), (state, action) => {
        state.processingId = null;
        state.error = action.payload;
      });
  },
});

export default ordersSlice.reducer;
