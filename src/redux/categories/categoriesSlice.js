// ============================================================
// Categories — the aisles, now owned by the shopkeeper.
//
// They live in the `categories` Firestore collection instead of a constant in
// the code, so aisles can be added, renamed, reordered and hidden from the
// dashboard. DEFAULT_CATEGORIES is only a seed for a brand-new store.
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
  writeBatch,
} from "firebase/firestore";
import slugify from "slugify";
import { db } from "../../lib/firebaseClient";
import { DEFAULT_CATEGORIES } from "../../data/grocery";

const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name);

export const fetchCategories = createAsyncThunk(
  "categories/fetchCategories",
  async (_, { rejectWithValue }) => {
    try {
      const snap = await getDocs(collection(db, "categories"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byOrder);
    } catch (err) {
      return rejectWithValue(err.message || "Failed to load categories");
    }
  }
);

export const addCategory = createAsyncThunk(
  "categories/addCategory",
  async (form, { getState, rejectWithValue }) => {
    try {
      const slug = form.slug?.trim() || slugify(form.name, { lower: true, strict: true });
      const existing = getState().categories.items;
      if (existing.some((c) => c.slug === slug)) {
        return rejectWithValue("An aisle with that name already exists");
      }

      const payload = {
        name: form.name.trim(),
        slug,
        accent: form.accent || "#4267B2",
        description: form.description || "",
        visible: form.visible !== false,
        order: Number.isFinite(Number(form.order)) ? Number(form.order) : existing.length,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "categories"), payload);
      const { createdAt, ...rest } = payload;
      return { id: ref.id, ...rest };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to add the aisle");
    }
  }
);

export const updateCategory = createAsyncThunk(
  "categories/updateCategory",
  async ({ id, form }, { getState, rejectWithValue }) => {
    try {
      const slug = form.slug?.trim() || slugify(form.name, { lower: true, strict: true });
      const clash = getState().categories.items.find((c) => c.slug === slug && c.id !== id);
      if (clash) return rejectWithValue("Another aisle already uses that name");

      const payload = {
        name: form.name.trim(),
        slug,
        accent: form.accent || "#4267B2",
        description: form.description || "",
        visible: form.visible !== false,
        order: Number(form.order) || 0,
      };
      await updateDoc(doc(db, "categories", id), payload);
      return { id, ...payload };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to update the aisle");
    }
  }
);

/** Visibility-only write — used by the on/off switch in the aisle list. */
export const toggleCategoryVisible = createAsyncThunk(
  "categories/toggleVisible",
  async ({ id, visible }, { rejectWithValue }) => {
    try {
      await updateDoc(doc(db, "categories", id), { visible });
      return { id, visible };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to update visibility");
    }
  }
);

/** Move an aisle up or down; writes the whole order in one batch. */
export const reorderCategories = createAsyncThunk(
  "categories/reorder",
  async (ordered, { rejectWithValue }) => {
    try {
      const batch = writeBatch(db);
      ordered.forEach((c, index) => batch.update(doc(db, "categories", c.id), { order: index }));
      await batch.commit();
      return ordered.map((c, index) => ({ id: c.id, order: index }));
    } catch (err) {
      return rejectWithValue(err.message || "Failed to reorder aisles");
    }
  }
);

export const deleteCategory = createAsyncThunk(
  "categories/deleteCategory",
  async (id, { rejectWithValue }) => {
    try {
      await deleteDoc(doc(db, "categories", id));
      return id;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to delete the aisle");
    }
  }
);

/**
 * One-tap fill for an empty store: writes the default grocery aisles.
 * Idempotent — only slugs that do not exist yet are created, so a double-click
 * (or a second visit) cannot duplicate the whole set.
 */
export const seedCategories = createAsyncThunk(
  "categories/seed",
  async (_, { getState, rejectWithValue }) => {
    try {
      // Re-read from the server first: another tab may have seeded already.
      const snap = await getDocs(collection(db, "categories"));
      const existing = new Set(snap.docs.map((d) => d.data().slug));
      const missing = DEFAULT_CATEGORIES.filter((c) => !existing.has(c.slug));

      if (!missing.length) return rejectWithValue("Those aisles already exist");

      const offset = snap.size;
      const batch = writeBatch(db);
      const created = missing.map((c, index) => {
        const ref = doc(collection(db, "categories"));
        const payload = {
          name: c.name,
          slug: c.slug,
          accent: c.accent,
          description: "",
          visible: true,
          order: offset + index,
        };
        batch.set(ref, { ...payload, createdAt: serverTimestamp() });
        return { id: ref.id, ...payload };
      });
      await batch.commit();
      return created;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to create the default aisles");
    }
  }
);

/**
 * Delete aisles that share a slug, keeping the oldest of each. Cleans up after
 * the non-idempotent seed that shipped first.
 */
export const removeDuplicateCategories = createAsyncThunk(
  "categories/removeDuplicates",
  async (_, { getState, rejectWithValue }) => {
    try {
      const items = getState().categories.items;
      const seen = new Map();
      const doomed = [];

      items.forEach((c) => {
        const keeper = seen.get(c.slug);
        if (!keeper) {
          seen.set(c.slug, c);
          return;
        }
        // Keep whichever was created first; drop the other.
        const keeperTime = keeper.createdAt?.seconds ?? 0;
        const thisTime = c.createdAt?.seconds ?? 0;
        if (thisTime < keeperTime) {
          seen.set(c.slug, c);
          doomed.push(keeper.id);
        } else {
          doomed.push(c.id);
        }
      });

      if (!doomed.length) return rejectWithValue("No duplicate aisles found");

      const batch = writeBatch(db);
      doomed.forEach((id) => batch.delete(doc(db, "categories", id)));
      await batch.commit();
      return doomed;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to remove duplicates");
    }
  }
);

const categoriesSlice = createSlice({
  name: "categories",
  initialState: {
    items: [],
    loading: false,
    saving: false,
    processingId: null,
    loaded: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.items = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.error = action.payload;
      })

      .addCase(addCategory.pending, (state) => {
        state.saving = true;
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        state.saving = false;
        state.items = [...state.items, action.payload].sort(byOrder);
      })
      .addCase(addCategory.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(updateCategory.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.saving = false;
        const i = state.items.findIndex((c) => c.id === action.payload.id);
        if (i !== -1) state.items[i] = { ...state.items[i], ...action.payload };
        state.items.sort(byOrder);
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(toggleCategoryVisible.pending, (state, action) => {
        state.processingId = action.meta.arg.id;
      })
      .addCase(toggleCategoryVisible.fulfilled, (state, action) => {
        state.processingId = null;
        const cat = state.items.find((c) => c.id === action.payload.id);
        if (cat) cat.visible = action.payload.visible;
      })
      .addCase(toggleCategoryVisible.rejected, (state, action) => {
        state.processingId = null;
        state.error = action.payload;
      })

      .addCase(reorderCategories.fulfilled, (state, action) => {
        action.payload.forEach(({ id, order }) => {
          const cat = state.items.find((c) => c.id === id);
          if (cat) cat.order = order;
        });
        state.items.sort(byOrder);
      })

      .addCase(deleteCategory.pending, (state, action) => {
        state.processingId = action.meta.arg;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.processingId = null;
        state.items = state.items.filter((c) => c.id !== action.payload);
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.processingId = null;
        state.error = action.payload;
      })

      .addCase(seedCategories.pending, (state) => {
        state.saving = true;
      })
      .addCase(seedCategories.fulfilled, (state, action) => {
        state.saving = false;
        // Append, never replace: the seed only returns the aisles it created.
        state.items = [...state.items, ...action.payload].sort(byOrder);
      })
      .addCase(seedCategories.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(removeDuplicateCategories.pending, (state) => {
        state.saving = true;
      })
      .addCase(removeDuplicateCategories.fulfilled, (state, action) => {
        state.saving = false;
        state.items = state.items.filter((c) => !action.payload.includes(c.id));
      })
      .addCase(removeDuplicateCategories.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export default categoriesSlice.reducer;
