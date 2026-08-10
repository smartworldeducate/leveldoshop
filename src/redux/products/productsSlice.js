// ============================================================
// Products — the single catalogue slice.
//
// The storefront reads `state.products.items`; the dashboard reads the same
// array and mutates it through these thunks. There is deliberately no second
// "admin products" slice: two copies of the catalogue drift apart.
// ============================================================

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import slugify from "slugify";
import { db } from "../../lib/firebaseClient";
import { uploadToCloudinary } from "../../lib/cloudinary";

/** Form → Firestore document. One mapping, used by both add and update. */
function toDocument(form, imageUrls) {
  return {
    title: form.title.trim(),
    brand: (form.brand || "").trim(),
    price: Number(form.price) || 0,
    comparePrice: Number(form.comparePrice) || 0,
    stock: Number(form.stock) || 0,
    unit: form.unit || "pc",
    packSize: Number(form.packSize) || 1,
    categorySlug: form.categorySlug,
    storage: form.storage || "ambient",
    organic: Boolean(form.organic),
    expiry: form.expiry || "",
    description: form.description || "",
    images: imageUrls,
    slug: slugify(form.title, { lower: true, strict: true }),
  };
}

/**
 * Upload any newly picked files and merge them with the kept URLs.
 * uploadToCloudinary resolves to null on failure, so a silent miss would
 * otherwise store a null in `images` and render a broken tile forever.
 */
async function resolveImages(form) {
  const kept = (form.images || []).filter(Boolean);
  if (!form.files?.length) return kept;

  const uploaded = await Promise.all(form.files.map((f) => uploadToCloudinary(f)));
  const ok = uploaded.filter(Boolean);
  if (ok.length !== uploaded.length) {
    throw new Error("Some images failed to upload — check your connection and try again");
  }
  return [...kept, ...ok];
}

export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (_, { rejectWithValue }) => {
    try {
      const snap = await getDocs(collection(db, "products"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to load products");
    }
  }
);

export const addProduct = createAsyncThunk(
  "products/addProduct",
  async (form, { rejectWithValue }) => {
    try {
      const images = await resolveImages(form);
      if (!images.length) return rejectWithValue("At least one product image is required");

      const payload = toDocument(form, images);
      const ref = await addDoc(collection(db, "products"), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      return { id: ref.id, ...payload };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to add product");
    }
  }
);

export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async ({ id, form }, { rejectWithValue }) => {
    try {
      const images = await resolveImages(form);
      if (!images.length) return rejectWithValue("At least one product image is required");

      const payload = toDocument(form, images);
      await updateDoc(doc(db, "products", id), payload);
      return { id, ...payload };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to update product");
    }
  }
);

/**
 * Stock-only write, used by the Inventory page. Kept separate from
 * updateProduct so a restock never re-uploads images or rewrites the slug.
 */
export const adjustStock = createAsyncThunk(
  "products/adjustStock",
  async ({ id, stock }, { rejectWithValue }) => {
    try {
      const next = Math.max(0, Number(stock) || 0);
      await updateDoc(doc(db, "products", id), { stock: next });
      return { id, stock: next };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to update stock");
    }
  }
);

export const deleteProduct = createAsyncThunk(
  "products/deleteProduct",
  async (id, { rejectWithValue }) => {
    try {
      await deleteDoc(doc(db, "products", id));
      return id;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to delete product");
    }
  }
);

const productsSlice = createSlice({
  name: "products",
  initialState: {
    items: [],
    loading: false,
    saving: false,
    processingId: null,
    error: null,
  },
  reducers: {
    clearProductsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(addProduct.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.saving = false;
        state.items.unshift(action.payload);
      })
      .addCase(addProduct.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(updateProduct.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.saving = false;
        const i = state.items.findIndex((p) => p.id === action.payload.id);
        // Merge: the payload has no createdAt, and losing it would reorder the list.
        if (i !== -1) state.items[i] = { ...state.items[i], ...action.payload };
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(adjustStock.pending, (state, action) => {
        state.processingId = action.meta.arg.id;
      })
      .addCase(adjustStock.fulfilled, (state, action) => {
        state.processingId = null;
        const product = state.items.find((p) => p.id === action.payload.id);
        if (product) product.stock = action.payload.stock;
      })
      .addCase(adjustStock.rejected, (state, action) => {
        state.processingId = null;
        state.error = action.payload;
      })

      .addCase(deleteProduct.pending, (state, action) => {
        state.processingId = action.meta.arg;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.processingId = null;
        state.items = state.items.filter((p) => p.id !== action.payload);
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.processingId = null;
        state.error = action.payload;
      });
  },
});

export const { clearProductsError } = productsSlice.actions;
export default productsSlice.reducer;
