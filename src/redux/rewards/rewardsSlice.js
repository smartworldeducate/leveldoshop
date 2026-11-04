// ============================================================
// Reward draws: free to enter. See src/data/rewards.js.
// ============================================================

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
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
import { drawFields, entryId, maskName, pickWinner } from "../../data/rewards";

const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export const fetchDraws = createAsyncThunk("rewards/fetchDraws", async (_, { rejectWithValue }) => {
  try {
    return rows(await getDocs(collection(db, "rewardDraws"))).sort((a, b) =>
      String(b.closesAt).localeCompare(String(a.closesAt))
    );
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const saveDraw = createAsyncThunk("rewards/saveDraw", async ({ id, form }, { rejectWithValue }) => {
  try {
    const fields = drawFields(form);
    if (id) {
      await updateDoc(doc(db, "rewardDraws", id), fields);
      return { id, ...fields };
    }
    const ref = await addDoc(collection(db, "rewardDraws"), { ...fields, createdAt: serverTimestamp() });
    return { id: ref.id, ...fields };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchEntries = createAsyncThunk("rewards/fetchEntries", async (drawId, { rejectWithValue }) => {
  try {
    const snap = await getDocs(query(collection(db, "rewardEntries"), where("drawId", "==", drawId)));
    return { drawId, entries: rows(snap) };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/** The draw and all its entries, so nothing personal is left behind. */
export const deleteDraw = createAsyncThunk("rewards/deleteDraw", async (id, { rejectWithValue }) => {
  try {
    const snap = await getDocs(query(collection(db, "rewardEntries"), where("drawId", "==", id)));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, "rewardDraws", id));
    await batch.commit();
    return id;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/** Earlier winners stay on record, and a redraw can't pick them again. */
export const drawWinner = createAsyncThunk("rewards/drawWinner", async ({ drawId, reason = "" }, { rejectWithValue }) => {
  try {
    const entries = rows(await getDocs(query(collection(db, "rewardEntries"), where("drawId", "==", drawId))));
    const ref = doc(db, "rewardDraws", drawId);

    const patch = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error("Draw not found");
      const draw = snap.data();
      if (new Date() <= new Date(draw.closesAt)) throw new Error("Entries are still open");

      const history = draw.history || [];
      const entry = pickWinner(entries, history.map((h) => h.entryId));
      if (!entry) throw new Error(entries.length ? "Everyone who entered has already been picked" : "Nobody has entered yet");

      const at = new Date().toISOString();
      const by = auth.currentUser?.email || "";
      const next = {
        winner: { entryId: entry.id, name: maskName(entry.name), at },
        history: [...history, { entryId: entry.id, at, by, entries: entries.length, reason: reason.trim() }],
      };
      transaction.update(ref, next);
      return next;
    });
    return { id: drawId, patch };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchMyEntry = createAsyncThunk("rewards/fetchMyEntry", async ({ drawId, uid }, { rejectWithValue }) => {
  try {
    const snap = await getDoc(doc(db, "rewardEntries", entryId(drawId, uid)));
    return { drawId, entered: snap.exists() };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const enterDraw = createAsyncThunk("rewards/enter", async ({ drawId, name, phone }, { rejectWithValue }) => {
  try {
    const uid = auth.currentUser.uid;
    await setDoc(doc(db, "rewardEntries", entryId(drawId, uid)), {
      drawId,
      uid,
      name: name.trim(),
      phone: phone.trim(),
      createdAt: serverTimestamp(),
    });
    return { drawId, entered: true };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const rewardsSlice = createSlice({
  name: "rewards",
  initialState: { draws: [], loaded: false, entries: {}, entered: {} },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDraws.fulfilled, (state, action) => {
        state.draws = action.payload;
        state.loaded = true;
      })
      .addCase(fetchDraws.rejected, (state) => {
        state.loaded = true;
      })
      .addCase(saveDraw.fulfilled, (state, action) => {
        const i = state.draws.findIndex((d) => d.id === action.payload.id);
        if (i === -1) state.draws.unshift(action.payload);
        else state.draws[i] = { ...state.draws[i], ...action.payload };
      })
      .addCase(deleteDraw.fulfilled, (state, action) => {
        state.draws = state.draws.filter((d) => d.id !== action.payload);
      })
      .addCase(fetchEntries.fulfilled, (state, action) => {
        state.entries[action.payload.drawId] = action.payload.entries;
      })
      .addCase(drawWinner.fulfilled, (state, action) => {
        const draw = state.draws.find((d) => d.id === action.payload.id);
        if (draw) Object.assign(draw, action.payload.patch);
      })
      .addCase(fetchMyEntry.fulfilled, (state, action) => {
        state.entered[action.payload.drawId] = action.payload.entered;
      })
      .addCase(enterDraw.fulfilled, (state, action) => {
        state.entered[action.payload.drawId] = true;
      });
  },
});

export default rewardsSlice.reducer;
