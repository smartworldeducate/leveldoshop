// ============================================================
// Coupons. Staff manage the whole list; the storefront only ever asks for
// the ones marked to show on the site.
// ============================================================

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../lib/firebaseClient";
import { couponFields, couponStatus, normalizeCode } from "../../data/coupons";

export const fetchCoupons = createAsyncThunk("coupons/fetch", async (_, { rejectWithValue }) => {
  try {
    const snap = await getDocs(collection(db, "coupons"));
    return snap.docs
      .map((d) => ({ id: d.id, code: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (err) {
    return rejectWithValue(err.message || "Failed to load coupons");
  }
});

/** What the storefront may advertise: marked to show, and usable right now. */
export const fetchSiteCoupons = createAsyncThunk("coupons/fetchSite", async (_, { rejectWithValue }) => {
  try {
    const snap = await getDocs(query(collection(db, "coupons"), where("showOnSite", "==", true)));
    return snap.docs
      .map((d) => ({ id: d.id, code: d.id, ...d.data() }))
      .filter((c) => couponStatus(c).key === "active")
      .map(({ createdAt, ...coupon }) => coupon);
  } catch (err) {
    return rejectWithValue(err.message || "Failed to load offers");
  }
});

export const createCoupon = createAsyncThunk("coupons/create", async (form, { rejectWithValue }) => {
  try {
    const code = normalizeCode(form.code);
    const ref = doc(db, "coupons", code);
    const fields = { ...couponFields(form), usedCount: 0 };
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (snap.exists()) throw new Error("A coupon with that code already exists");
      transaction.set(ref, { ...fields, createdAt: serverTimestamp() });
    });
    return { id: code, code, ...fields };
  } catch (err) {
    return rejectWithValue(err.message || "Failed to create the coupon");
  }
});

/** The code and the usage count never change here. */
export const updateCoupon = createAsyncThunk("coupons/update", async ({ code, form }, { rejectWithValue }) => {
  try {
    const fields = couponFields(form);
    await updateDoc(doc(db, "coupons", code), fields);
    return { code, ...fields };
  } catch (err) {
    return rejectWithValue(err.message || "Failed to save the coupon");
  }
});

export const toggleCoupon = createAsyncThunk("coupons/toggle", async ({ code, enabled }, { rejectWithValue }) => {
  try {
    await updateDoc(doc(db, "coupons", code), { enabled });
    return { code, enabled };
  } catch (err) {
    return rejectWithValue(err.message || "Failed to update the coupon");
  }
});

/** Clears the per-customer counts too, so re-creating the code starts fresh. */
export const deleteCoupon = createAsyncThunk("coupons/delete", async (code, { rejectWithValue }) => {
  try {
    const redemptions = await getDocs(collection(db, "coupons", code, "redemptions"));
    const batch = writeBatch(db);
    redemptions.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await deleteDoc(doc(db, "coupons", code));
    return code;
  } catch (err) {
    return rejectWithValue(err.message || "Failed to delete the coupon");
  }
});

const couponsSlice = createSlice({
  name: "coupons",
  initialState: { items: [], site: [], loading: false, loaded: false, saving: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCoupons.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCoupons.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.items = action.payload;
      })
      .addCase(fetchCoupons.rejected, (state) => {
        state.loading = false;
        state.loaded = true;
      })
      .addCase(fetchSiteCoupons.fulfilled, (state, action) => {
        state.site = action.payload;
      })

      .addCase(createCoupon.pending, (state) => {
        state.saving = true;
      })
      .addCase(createCoupon.fulfilled, (state, action) => {
        state.saving = false;
        state.items.unshift(action.payload);
      })
      .addCase(createCoupon.rejected, (state) => {
        state.saving = false;
      })

      .addCase(updateCoupon.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateCoupon.fulfilled, (state, action) => {
        state.saving = false;
        const coupon = state.items.find((c) => c.code === action.payload.code);
        if (coupon) Object.assign(coupon, action.payload);
      })
      .addCase(updateCoupon.rejected, (state) => {
        state.saving = false;
      })

      .addCase(toggleCoupon.fulfilled, (state, action) => {
        const coupon = state.items.find((c) => c.code === action.payload.code);
        if (coupon) coupon.enabled = action.payload.enabled;
      })
      .addCase(deleteCoupon.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.code !== action.payload);
      });
  },
});

export default couponsSlice.reducer;
