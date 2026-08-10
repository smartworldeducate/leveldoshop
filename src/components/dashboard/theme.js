// ============================================================
// Dashboard design tokens.
//
// Tailwind v4 scans source files for *literal* class strings, so tokens have
// to be written out in full here (never composed with `${}`) for the utilities
// to be generated. Every surface, radius and shadow in the back-office comes
// from this file — that is what keeps the pages looking like one product.
// ============================================================

// Surfaces
export const CARD = "rounded-[26px] bg-white shadow-[0_20px_45px_-30px_rgba(80,70,150,0.55)]";
export const CARD_SM = "rounded-[22px] bg-white shadow-[0_20px_45px_-30px_rgba(80,70,150,0.55)]";
export const PANEL = "rounded-[32px] bg-[#F4F3FA]";
export const INSET = "rounded-2xl bg-[#F6F8FC]";

// Brand — hex values for SVG props and inline styles, classes for markup.
export const BRAND = "#4267B2";
export const BRAND_LIGHT = "#5B83D6";
export const FRESH = "#22C55E";
export const ACCENT = "#FF4D6D";

export const BRAND_GRADIENT = "bg-[linear-gradient(150deg,#5B83D6,#4267B2)]";
export const BRAND_TEXT = "text-[#4267B2]";
export const BRAND_TINT = "bg-[#E4ECFA]";

// Type
export const PAGE_TITLE = "text-2xl font-bold tracking-tight text-slate-800";
export const SECTION_TITLE = "text-sm font-semibold text-slate-700";
export const MUTED = "text-sm text-slate-400";
export const LABEL = "text-xs font-medium uppercase tracking-wide text-slate-400";

// Focus ring, applied to every interactive primitive
export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4267B2]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F3FA]";

/** Semantic tones — one palette for badges, alerts and stat tiles. */
export const TONES = {
  brand: { text: "text-[#4267B2]", bg: "bg-[#E4ECFA]", hex: "#4267B2" },
  success: { text: "text-emerald-600", bg: "bg-emerald-50", hex: "#10B981" },
  warning: { text: "text-amber-600", bg: "bg-amber-50", hex: "#F59E0B" },
  danger: { text: "text-rose-600", bg: "bg-rose-50", hex: "#E11D48" },
  info: { text: "text-cyan-600", bg: "bg-cyan-50", hex: "#0891B2" },
  neutral: { text: "text-slate-500", bg: "bg-slate-100", hex: "#64748B" },
};

export const tone = (key) => TONES[key] || TONES.neutral;
