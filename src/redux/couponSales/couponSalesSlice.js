// ============================================================
// Coupon sales: offers anyone can see, and purchases staff act on.
// ============================================================

import { createSlice, createAsyncThunk, isFulfilled } from "@reduxjs/toolkit";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebaseClient";
import { generatePurchaseCode, offerFields, purchasedCoupon, offerStatus } from "../../data/couponSales";

const newestFirst = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const actor = () => auth.currentUser?.email || "";

export const fetchOffers = createAsyncThunk("couponSales/fetchOffers", async (_, { rejectWithValue }) => {
  try {
    return rows(await getDocs(collection(db, "couponOffers"))).sort(newestFirst);
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const saveOffer = createAsyncThunk("couponSales/saveOffer", async ({ id, form }, { rejectWithValue }) => {
  try {
    const fields = offerFields(form);
    if (id) {
      await updateDoc(doc(db, "couponOffers", id), fields);
      return { id, ...fields };
    }
    const ref = await addDoc(collection(db, "couponOffers"), { ...fields, soldCount: 0, createdAt: serverTimestamp() });
    return { id: ref.id, ...fields, soldCount: 0 };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const deleteOffer = createAsyncThunk("couponSales/deleteOffer", async (id, { rejectWithValue }) => {
  try {
    await deleteDoc(doc(db, "couponOffers", id));
    return id;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchPurchases = createAsyncThunk("couponSales/fetchPurchases", async (_, { rejectWithValue }) => {
  try {
    return rows(await getDocs(collection(db, "couponPurchases"))).sort(newestFirst);
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchMyPurchases = createAsyncThunk("couponSales/fetchMine", async (uid, { rejectWithValue }) => {
  try {
    const snap = await getDocs(query(collection(db, "couponPurchases"), where("buyer.uid", "==", uid)));
    return rows(snap).sort(newestFirst);
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/**
 * A customer's request. The price comes from the offer; security rules check it.
 * The receipt goes in its own private document, saved in the same write, so it
 * has no public link and lists of purchases don't download every image.
 */
export const requestPurchase = createAsyncThunk(
  "couponSales/requestPurchase",
  async ({ offer, buyer, reference = "", token, paymentMethod, receipt }, { rejectWithValue }) => {
    try {
      const ref = doc(collection(db, "couponPurchases"));
      const batch = writeBatch(db);
      batch.set(ref, {
        offerId: offer.id,
        offerTitle: offer.title,
        price: offer.price,
        buyer,
        reference: reference.trim(),
        token,
        paymentMethod,
        hasReceipt: true,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, "couponReceipts", ref.id), { uid: buyer.uid, image: receipt, createdAt: serverTimestamp() });
      await batch.commit();
      return ref.id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Saved under the PayPal order ID before any money moves, so one order is only
 * ever one purchase. Paying again after a declined card finds it already there.
 */
export const requestPaypalPurchase = createAsyncThunk(
  "couponSales/requestPaypalPurchase",
  async ({ offer, orderId, buyer, token, paymentMethod }, { rejectWithValue }) => {
    const ref = doc(db, "couponPurchases", orderId);
    try {
      await setDoc(ref, {
        offerId: offer.id,
        offerTitle: offer.title,
        price: offer.price,
        buyer,
        reference: orderId,
        token,
        paymentMethod,
        hasReceipt: false,
        paypalOrderId: orderId,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      return orderId;
    } catch (err) {
      const existing = await getDoc(ref).catch(() => null);
      if (existing?.exists()) return orderId;
      return rejectWithValue(err.message);
    }
  }
);

/** One receipt's image. Security rules only let the buyer and staff read it. */
export const loadReceipt = async (purchaseId) => {
  const snap = await getDoc(doc(db, "couponReceipts", purchaseId));
  return snap.exists() ? snap.data().image : null;
};

/**
 * Staff have seen the money: create the code. The discount comes from the
 * current offer, never from anything the customer's request contained.
 */
export const confirmPurchase = createAsyncThunk("couponSales/confirm", async (purchaseId, { rejectWithValue }) => {
  try {
    const purchaseRef = doc(db, "couponPurchases", purchaseId);
    const couponCode = generatePurchaseCode();
    const couponRef = doc(db, "coupons", couponCode);

    const patch = await runTransaction(db, async (transaction) => {
      const purchaseSnap = await transaction.get(purchaseRef);
      if (!purchaseSnap.exists()) throw new Error("Purchase not found");
      const purchase = purchaseSnap.data();
      if (purchase.status !== "pending") throw new Error("This purchase was already decided");

      const offerRef = doc(db, "couponOffers", purchase.offerId);
      const offerSnap = await transaction.get(offerRef);
      if (!offerSnap.exists()) throw new Error("This offer was deleted, so there's no coupon to issue");
      const offer = offerSnap.data();
      if (offerStatus(offer).key === "sold_out") throw new Error("This offer is sold out. Reject the purchase and refund the customer");

      if ((await transaction.get(couponRef)).exists()) throw new Error("Please try again");

      const coupon = purchasedCoupon(offer, { id: purchaseId });
      transaction.set(couponRef, { ...coupon, createdAt: serverTimestamp() });
      transaction.update(offerRef, { soldCount: (offer.soldCount || 0) + 1 });

      const next = {
        status: "confirmed",
        couponCode,
        // A copy for showing the customer, so it survives the offer changing.
        coupon: {
          type: coupon.type,
          value: coupon.value,
          maxDiscount: coupon.maxDiscount,
          minOrder: coupon.minOrder,
          categorySlugs: coupon.categorySlugs,
          endsAt: coupon.endsAt,
        },
        // Fixed now: a buyer keeps the reward they paid under if the offer changes.
        reward: offer.rewardText ? { text: offer.rewardText, day: offer.rewardDay } : null,
        decidedAt: new Date().toISOString(),
        decidedBy: actor(),
      };
      transaction.update(purchaseRef, next);
      return { next, offerId: purchase.offerId, soldCount: (offer.soldCount || 0) + 1 };
    });

    return { id: purchaseId, patch: patch.next, offerId: patch.offerId, soldCount: patch.soldCount };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const rejectPurchase = createAsyncThunk("couponSales/reject", async ({ id, note }, { rejectWithValue }) => {
  try {
    const ref = doc(db, "couponPurchases", id);
    const patch = { status: "rejected", rejectNote: note.trim(), decidedAt: new Date().toISOString(), decidedBy: actor() };
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (snap.data()?.status !== "pending") throw new Error("This purchase was already decided");
      transaction.update(ref, patch);
    });
    return { id, patch };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/** After a refund: stops the code working. Refused once it has been used. */
export const revokePurchase = createAsyncThunk("couponSales/revoke", async (id, { rejectWithValue }) => {
  try {
    const purchaseRef = doc(db, "couponPurchases", id);
    const patch = { status: "revoked", decidedAt: new Date().toISOString(), decidedBy: actor() };
    const result = await runTransaction(db, async (transaction) => {
      const purchase = (await transaction.get(purchaseRef)).data();
      if (purchase?.status !== "confirmed") throw new Error("Only confirmed purchases can be cancelled");

      const couponRef = doc(db, "coupons", purchase.couponCode);
      const couponSnap = await transaction.get(couponRef);
      if (couponSnap.data()?.usedCount > 0) throw new Error("This code has already been used, so it can't be cancelled");

      const offerRef = doc(db, "couponOffers", purchase.offerId);
      const offerSnap = await transaction.get(offerRef);

      if (couponSnap.exists()) transaction.update(couponRef, { enabled: false });
      const soldCount = Math.max(0, (offerSnap.data()?.soldCount || 0) - 1);
      if (offerSnap.exists()) transaction.update(offerRef, { soldCount });
      transaction.update(purchaseRef, patch);
      return { offerId: purchase.offerId, soldCount };
    });
    return { id, patch, ...result };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const markRewardGiven = createAsyncThunk("couponSales/rewardGiven", async ({ id, given }, { rejectWithValue }) => {
  try {
    const patch = given
      ? { rewardGivenAt: new Date().toISOString(), rewardGivenBy: actor() }
      : { rewardGivenAt: "", rewardGivenBy: "" };
    await updateDoc(doc(db, "couponPurchases", id), patch);
    return { id, patch };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/** Staff passed the code on. Only for the to-do list: customers always see it on My coupons. */
export const markCodeSent = createAsyncThunk("couponSales/codeSent", async (id, { rejectWithValue }) => {
  try {
    const patch = { codeSentAt: new Date().toISOString() };
    await updateDoc(doc(db, "couponPurchases", id), patch);
    return { id, patch };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const couponSalesSlice = createSlice({
  name: "couponSales",
  initialState: { offers: [], offersLoaded: false, purchases: [], purchasesLoaded: false, mine: [], mineLoaded: false, processingId: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOffers.fulfilled, (state, action) => {
        state.offers = action.payload;
        state.offersLoaded = true;
      })
      .addCase(fetchOffers.rejected, (state) => {
        state.offersLoaded = true;
      })
      .addCase(saveOffer.fulfilled, (state, action) => {
        const i = state.offers.findIndex((o) => o.id === action.payload.id);
        if (i === -1) state.offers.unshift(action.payload);
        else state.offers[i] = { ...state.offers[i], ...action.payload };
      })
      .addCase(deleteOffer.fulfilled, (state, action) => {
        state.offers = state.offers.filter((o) => o.id !== action.payload);
      })
      .addCase(fetchPurchases.fulfilled, (state, action) => {
        state.purchases = action.payload;
        state.purchasesLoaded = true;
      })
      .addCase(fetchPurchases.rejected, (state) => {
        state.purchasesLoaded = true;
      })
      .addCase(fetchMyPurchases.fulfilled, (state, action) => {
        state.mine = action.payload;
        state.mineLoaded = true;
      })
      .addCase(fetchMyPurchases.rejected, (state) => {
        state.mineLoaded = true;
      })
      .addCase(confirmPurchase.pending, (state, action) => {
        state.processingId = action.meta.arg;
      })
      .addCase(confirmPurchase.rejected, (state) => {
        state.processingId = null;
      })
      .addCase(revokePurchase.pending, (state, action) => {
        state.processingId = action.meta.arg;
      })
      .addCase(revokePurchase.rejected, (state) => {
        state.processingId = null;
      })
      .addMatcher(isFulfilled(confirmPurchase, rejectPurchase, revokePurchase, markRewardGiven, markCodeSent), (state, action) => {
        const { id, patch, offerId, soldCount } = action.payload;
        state.processingId = null;
        const purchase = state.purchases.find((p) => p.id === id);
        if (purchase) Object.assign(purchase, patch);
        const offer = state.offers.find((o) => o.id === offerId);
        if (offer && soldCount !== undefined) offer.soldCount = soldCount;
      });
  },
});

export default couponSalesSlice.reducer;
