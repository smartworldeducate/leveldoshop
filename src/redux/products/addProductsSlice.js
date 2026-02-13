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
import { db } from "../../lib/firebaseClient";
import { uploadToCloudinary } from "../../lib/cloudinary";
import slugify from "slugify";

// -------------------- Async Thunks -------------------- //

// Fetch all products
export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (_, { rejectWithValue }) => {
    try {
      const snap = await getDocs(collection(db, "products"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort by createdAt descending
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      return data;
    } catch (err) {
      console.error("Fetch products failed:", err);
      return rejectWithValue("Failed to fetch products");
    }
  }
);

// Add product
export const addProduct = createAsyncThunk(
  "products/addProduct",
  async (form, { rejectWithValue }) => {
    try {
      let imageUrls = [...form.images];

      if (form.files && form.files.length > 0) {
        try {
          const uploaded = await Promise.all(form.files.map((f) => uploadToCloudinary(f)));
          imageUrls = [...imageUrls, ...uploaded];
        } catch (err) {
          console.error("Cloudinary upload failed:", err);
          return rejectWithValue("Image upload failed");
        }
      }

      if (!imageUrls.length) {
        return rejectWithValue("At least one image is required");
      }

      const payload = {
        title: form.title,
        price: Number(form.price),
        stock: Number(form.stock),
        categorySlug: form.categorySlug,
        colors: form.colors,
        size: form.size,
        description: form.description,
        images: imageUrls,
        slug: slugify(form.title, { lower: true }),
        awslink: form.awslink || "",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "products"), payload);
      return { id: docRef.id, ...payload };
    } catch (err) {
      console.error("Add product failed:", err);
      return rejectWithValue("Failed to add product");
    }
  }
);

// Update product
export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async ({ id, form }, { rejectWithValue }) => {
    try {
      let imageUrls = [...form.images];

      if (form.files && form.files.length > 0) {
        try {
          const uploaded = await Promise.all(form.files.map((f) => uploadToCloudinary(f)));
          imageUrls = [...imageUrls, ...uploaded];
        } catch (err) {
          console.error("Cloudinary upload failed:", err);
          return rejectWithValue("Image upload failed");
        }
      }

      if (!imageUrls.length) {
        return rejectWithValue("At least one image is required");
      }

      const payload = {
        title: form.title,
        price: Number(form.price),
        stock: Number(form.stock),
        categorySlug: form.categorySlug,
        colors: form.colors,
        size: form.size,
        description: form.description,
        images: imageUrls,
        slug: slugify(form.title, { lower: true }),
        awslink: form.awslink || "",
      };

      await updateDoc(doc(db, "products", id), payload);
      return { id, ...payload };
    } catch (err) {
      console.error("Update product failed:", err);
      return rejectWithValue("Failed to update product");
    }
  }
);

// Delete product
export const deleteProduct = createAsyncThunk(
  "products/deleteProduct",
  async (id, { rejectWithValue }) => {
    try {
      await deleteDoc(doc(db, "products", id));
      return id;
    } catch (err) {
      console.error("Delete product failed:", err);
      return rejectWithValue("Failed to delete product");
    }
  }
);

// -------------------- Slice -------------------- //

const addProductsSlice = createSlice({
  name: "products",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
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
        state.error = action.payload || action.error.message;
      })

      // Add
      .addCase(addProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(addProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Update
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Delete
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((p) => p.id !== action.payload);
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export default addProductsSlice.reducer;
