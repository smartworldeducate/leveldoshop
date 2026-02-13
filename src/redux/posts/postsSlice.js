import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { db } from "../../lib/firebaseClient";
import { uploadToCloudinary } from "../../lib/cloudinary";
import slugify from "slugify";

// -------------------- Async Thunks -------------------- //

// Fetch posts
export const fetchPosts = createAsyncThunk("posts/fetchPosts", async () => {
  const snap = await getDocs(collection(db, "posts"));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return data;
});

// Add post
export const addPost = createAsyncThunk("posts/addPost", async (form) => {
  let imageUrls = [...form.images];
  if (form.files.length > 0) {
    const uploaded = await Promise.all(form.files.map((f) => uploadToCloudinary(f)));
    imageUrls = [...imageUrls, ...uploaded];
  }
  const payload = {
    title: form.title,
    content: form.content,
    images: imageUrls,
    slug: slugify(form.title, { lower: true, strict: true }),
    likes: 0,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, "posts"), payload);
  return { id: docRef.id, ...payload };
});

// Update post
export const updatePost = createAsyncThunk("posts/updatePost", async ({ id, form }) => {
  let imageUrls = [...form.images];
  if (form.files.length > 0) {
    const uploaded = await Promise.all(form.files.map((f) => uploadToCloudinary(f)));
    imageUrls = [...imageUrls, ...uploaded];
  }
  const payload = {
    title: form.title,
    content: form.content,
    images: imageUrls,
    slug: slugify(form.title, { lower: true, strict: true }),
  };
  await updateDoc(doc(db, "posts", id), payload);
  return { id, ...payload };
});

// Delete post
export const deletePost = createAsyncThunk("posts/deletePost", async (id) => {
  await deleteDoc(doc(db, "posts", id));
  return id;
});

// -------------------- New: Like Post -------------------- //
export const likePost = createAsyncThunk("posts/likePost", async (id) => {
  const postRef = doc(db, "posts", id);
  await updateDoc(postRef, { likes: increment(1) });
  return id; // Return ID so we can increment in Redux state
});

// -------------------- Slice -------------------- //
const postsSlice = createSlice({
  name: "posts",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchPosts.pending, (state) => { state.loading = true; })
      .addCase(fetchPosts.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchPosts.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })

      // Add
      .addCase(addPost.pending, (state) => { state.loading = true; })
      .addCase(addPost.fulfilled, (state, action) => { state.loading = false; state.items.unshift(action.payload); })
      .addCase(addPost.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })

      // Update
      .addCase(updatePost.pending, (state) => { state.loading = true; })
      .addCase(updatePost.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(updatePost.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })

      // Delete
      .addCase(deletePost.pending, (state) => { state.loading = true; })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((p) => p.id !== action.payload);
      })
      .addCase(deletePost.rejected, (state, action) => { state.loading = false; state.error = action.error.message; })

      // Like
      .addCase(likePost.fulfilled, (state, action) => {
        const index = state.items.findIndex((p) => p.id === action.payload);
        if (index !== -1) {
          state.items[index].likes = (state.items[index].likes || 0) + 1;
        }
      });
  },
});

export default postsSlice.reducer;
