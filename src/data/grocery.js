// ============================================================
// Grocery domain — the single source of truth shared by the
// storefront and the dashboard. Categories, selling units and
// the stock / expiry rules all live here so a change in one
// place moves both halves of the app at once.
// ============================================================

/**
 * Seed aisles only. The live list lives in the `categories` Firestore
 * collection and is edited from the dashboard — read it from
 * `state.categories.items`, never from here.
 */
export const DEFAULT_CATEGORIES = [
  { slug: "fruits-vegetables", name: "Fruits & Vegetables", accent: "#22C55E" },
  { slug: "dairy-eggs", name: "Dairy & Eggs", accent: "#38BDF8" },
  { slug: "bakery", name: "Bakery", accent: "#F59E0B" },
  { slug: "meat-seafood", name: "Meat & Seafood", accent: "#EF4444" },
  { slug: "pantry", name: "Pantry & Staples", accent: "#A16207" },
  { slug: "beverages", name: "Beverages", accent: "#8B5CF6" },
  { slug: "snacks", name: "Snacks & Sweets", accent: "#EC4899" },
  { slug: "frozen", name: "Frozen Foods", accent: "#06B6D4" },
  { slug: "household", name: "Household & Cleaning", accent: "#0EA5E9" },
  { slug: "personal-care", name: "Personal Care", accent: "#14B8A6" },
];

/** Palette offered when creating an aisle — keeps custom aisles on-brand. */
export const CATEGORY_COLORS = [
  "#4267B2", "#22C55E", "#38BDF8", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#14B8A6", "#A16207",
];

// `base` groups units that can be compared (g → kg, ml → L) so we can print a
// "$4.20 / kg" unit price. `perBase` is how many of this unit fit in one base.
export const UNITS = [
  { value: "kg", label: "Kilogram (kg)", short: "kg", base: "kg", perBase: 1 },
  { value: "g", label: "Gram (g)", short: "g", base: "kg", perBase: 1000 },
  { value: "l", label: "Litre (L)", short: "L", base: "l", perBase: 1 },
  { value: "ml", label: "Millilitre (ml)", short: "ml", base: "l", perBase: 1000 },
  { value: "pc", label: "Piece", short: "pc", base: null },
  { value: "pack", label: "Pack", short: "pack", base: null },
  { value: "dozen", label: "Dozen", short: "dz", base: null },
  { value: "bunch", label: "Bunch", short: "bunch", base: null },
];

export const STORAGE_TYPES = [
  { value: "ambient", label: "Ambient / dry" },
  { value: "chilled", label: "Chilled" },
  { value: "frozen", label: "Frozen" },
];

/** Stock at or below this is flagged "low" everywhere in the app. */
export const LOW_STOCK_THRESHOLD = 10;
/** Batches expiring within this many days are flagged "expiring soon". */
export const EXPIRY_SOON_DAYS = 7;

/** Blank product — the shape every grocery product document uses. */
export const EMPTY_PRODUCT = {
  id: null,
  title: "",
  brand: "",
  price: "",
  comparePrice: "",
  stock: 0,
  unit: "kg",
  packSize: 1,
  categorySlug: "",
  storage: "ambient",
  organic: false,
  expiry: "",
  description: "",
  images: [],
  files: [],
  slug: "",
};

// -------------------- lookups -------------------- //
//
// Category helpers take the live list as their first argument. A product may
// reference an aisle that has since been renamed or deleted, so every lookup
// falls back to a readable version of the stored slug rather than "undefined".

/** "fruits-vegetables" → "Fruits Vegetables" */
export const prettySlug = (slug) =>
  String(slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

export const findCategory = (categories, slug) =>
  (categories || []).find((c) => c.slug === slug);

export const categoryLabel = (categories, slug) =>
  findCategory(categories, slug)?.name || prettySlug(slug) || "Uncategorised";

export const categoryAccent = (categories, slug) =>
  findCategory(categories, slug)?.accent || "#4267B2";

/** Aisles a shopper may see: visible, in dashboard order. */
export const visibleCategories = (categories) =>
  (categories || []).filter((c) => c.visible !== false);

/**
 * Boxicon per aisle. Only names that exist in boxicons 2.0.7 are used — the
 * missing ones render as an empty box, which looks worse than the fallback.
 * Custom aisles created in the dashboard fall back to the basket.
 */
const AISLE_ICONS = {
  "fruits-vegetables": "bx bx-spa",
  "dairy-eggs": "bx bx-fridge",
  bakery: "bx bx-cake",
  "meat-seafood": "bx bx-restaurant",
  pantry: "bx bx-package",
  beverages: "bx bx-drink",
  snacks: "bx bx-cookie",
  frozen: "bx bx-cloud-snow",
  household: "bx bx-spray-can",
  "personal-care": "bx bx-heart",
};

export const aisleIcon = (slug) => AISLE_ICONS[slug] || "bx bx-basket";

export const unitBy = (value) => UNITS.find((u) => u.value === value);

export const unitShort = (value) => unitBy(value)?.short || value || "pc";

// -------------------- formatting -------------------- //

/** Money, one way, everywhere: `$1,299.50`. */
export function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compact money for tiles: `$12.4k`. */
export function formatMoneyCompact(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

/** How the product is sold: `500 g`, `1 kg`, `6 pc`. */
export function packLabel(product) {
  if (!product) return "";
  const size = Number(product.packSize) || 1;
  return `${size} ${unitShort(product.unit)}`;
}

/**
 * Price per base unit, when the unit is convertible — `$4.20 / kg`.
 * Returns null for piece/pack goods, where a unit price is meaningless.
 */
export function unitPrice(product) {
  const unit = unitBy(product?.unit);
  const price = Number(product?.price);
  const size = Number(product?.packSize) || 1;
  if (!unit?.base || !Number.isFinite(price) || size <= 0) return null;
  const perBaseUnit = (price / size) * unit.perBase;
  return `${formatMoney(perBaseUnit)} / ${unit.base === "kg" ? "kg" : "L"}`;
}

/** Percentage saved against the compare-at price, or null when not on offer. */
export function discountPercent(product) {
  const price = Number(product?.price);
  const was = Number(product?.comparePrice);
  if (!was || !price || was <= price) return null;
  return Math.round(((was - price) / was) * 100);
}

// -------------------- stock & freshness -------------------- //

/** One vocabulary for stock state — used by badges, filters and alerts. */
export function stockState(stock) {
  const n = Number(stock) || 0;
  if (n <= 0) return { key: "out", label: "Out of stock", tone: "danger" };
  if (n <= LOW_STOCK_THRESHOLD) return { key: "low", label: `Low · ${n} left`, tone: "warning" };
  return { key: "ok", label: `In stock · ${n}`, tone: "success" };
}

/** Days from today to `date` (negative when already past). */
export function daysUntil(date) {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86_400_000);
}

/** Freshness state for a best-before date. Returns null when none is set. */
export function expiryState(date) {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return { key: "expired", label: "Expired", tone: "danger", days };
  if (days === 0) return { key: "expired", label: "Expires today", tone: "danger", days };
  if (days <= EXPIRY_SOON_DAYS) return { key: "soon", label: `${days}d left`, tone: "warning", days };
  return { key: "ok", label: `${days}d left`, tone: "neutral", days };
}

/** True when a product should not be sellable on the storefront. */
export const isSellable = (product) => {
  const expiry = expiryState(product?.expiry);
  return (Number(product?.stock) || 0) > 0 && expiry?.key !== "expired";
};
