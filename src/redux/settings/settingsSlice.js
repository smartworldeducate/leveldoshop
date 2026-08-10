// ============================================================
// Storefront settings — one Firestore document (`settings/storefront`)
// that decides which pages and home-page sections shoppers can see.
// Missing document = every default below, so a fresh store just works.
// ============================================================

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebaseClient";
import { DEFAULT_HOME, withHomeDefaults } from "../../data/home";

export const SETTINGS_DOC = ["settings", "storefront"];

/** Pages that can be switched off. `catalog`, `cart` and the home page cannot. */
export const TOGGLEABLE_PAGES = [
  { key: "deals", label: "Deals", href: "/deals", note: "Marked-down and use-it-soon items" },
  { key: "posts", label: "Blog", href: "/posts", note: "Recipes and store news" },
  { key: "contact", label: "Contact", href: "/contact", note: "Contact form and store details" },
  { key: "policy", label: "Policies", href: "/policy", note: "Delivery, freshness, payment" },
];

/** Home-page blocks, in the order they render. */
export const HOME_SECTIONS = [
  { key: "promise", label: "Promise strip", note: "Delivery · freshness · payment · rewards" },
  { key: "aisles", label: "Explore our collections", note: "Aisle cards with an entry price" },
  { key: "offers", label: "Offer mosaic", note: "Four tiles built from live deals and arrivals" },
  { key: "deals", label: "Deals rail", note: "Only appears when something is reduced" },
  { key: "fresh", label: "Fresh in today", note: "Newest products" },
  { key: "promo", label: "Rewards banner", note: "Join-free promo band" },
  { key: "blog", label: "From the blog", note: "Three latest posts" },
  { key: "everything", label: "Popular in store", note: "A slice of the catalogue" },
];

/** Shown on the contact page and in the footer — blank fields simply hide. */
export const CONTACT_FIELDS = [
  { key: "phone", label: "Phone", placeholder: "03010483942", type: "tel" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "03039255409", type: "tel" },
  { key: "email", label: "Email", placeholder: "hello@leveldo.shop", type: "email" },
  { key: "address", label: "Street address", placeholder: "12 Market Road, Lahore" },
  { key: "hours", label: "Opening hours", placeholder: "Mon–Sat, 8am – 9pm" },
  { key: "orderCutoff", label: "Same-day cut-off", placeholder: "4pm" },
];

export const DEFAULT_SETTINGS = {
  storeName: "Leveldo Grocery",
  tagline: "Delivering today until 8pm",
  pages: Object.fromEntries(TOGGLEABLE_PAGES.map((p) => [p.key, true])),
  sections: Object.fromEntries(HOME_SECTIONS.map((s) => [s.key, true])),
  // Seeded with the numbers that used to be hardcoded in the footer, so no
  // contact detail was lost when they moved into settings. Editable in the
  // dashboard like everything else.
  contact: {
    ...Object.fromEntries(CONTACT_FIELDS.map((f) => [f.key, ""])),
    phone: "03010483942",
    whatsapp: "03039255409",
    orderCutoff: "4pm",
  },
  // Every word and picture on the home page — see src/data/home.js.
  home: DEFAULT_HOME,
};

/** Merge a stored doc over the defaults so new keys always have a value. */
const withDefaults = (data = {}) => ({
  ...DEFAULT_SETTINGS,
  ...data,
  pages: { ...DEFAULT_SETTINGS.pages, ...(data.pages || {}) },
  sections: { ...DEFAULT_SETTINGS.sections, ...(data.sections || {}) },
  contact: { ...DEFAULT_SETTINGS.contact, ...(data.contact || {}) },
  home: withHomeDefaults(data.home),
});

export const fetchSettings = createAsyncThunk(
  "settings/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const snap = await getDoc(doc(db, ...SETTINGS_DOC));
      return withDefaults(snap.exists() ? snap.data() : {});
    } catch (err) {
      return rejectWithValue(err.message || "Failed to load settings");
    }
  }
);

export const saveSettings = createAsyncThunk(
  "settings/save",
  async (values, { rejectWithValue }) => {
    try {
      const next = withDefaults(values);
      await setDoc(doc(db, ...SETTINGS_DOC), next, { merge: true });
      return next;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to save settings");
    }
  }
);

const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    values: DEFAULT_SETTINGS,
    loading: false,
    saving: false,
    loaded: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.values = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.error = action.payload;
      })

      .addCase(saveSettings.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.saving = false;
        state.values = action.payload;
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export default settingsSlice.reducer;
