// ============================================================
// Home page content — the copy, links and imagery of every
// storefront block, owned by the shopkeeper rather than the
// code. Stored inside the `settings/storefront` document under
// `home`, edited from /dashboard/home.
//
// The values below are the defaults a brand-new shop starts
// with, and they are also the fallback for any field left
// blank: a cleared headline shows the default rather than an
// empty page. Blocks that are *derived* from live stock (the
// deal percentage, the "from" prices, the newest arrival) stay
// derived — the dashboard sets the frame, the shelves fill it.
// ============================================================

/** Boxicons offered in the dashboard pickers. All exist in boxicons 2.0.7. */
export const HOME_ICONS = [
  "bx bx-cycling",
  "bx bx-check-shield",
  "bx bx-wallet",
  "bx bx-gift",
  "bx bx-basket",
  "bx bx-cart",
  "bx bx-purchase-tag",
  "bx bx-time-five",
  "bx bx-timer",
  "bx bx-package",
  "bx bx-store",
  "bx bx-medal",
  "bx bx-award",
  "bx bx-list-check",
  "bx bx-search-alt",
  "bx bx-spa",
  "bx bx-fridge",
  "bx bx-cake",
  "bx bx-restaurant",
  "bx bx-drink",
  "bx bx-cookie",
  "bx bx-cloud-snow",
  "bx bx-spray-can",
  "bx bx-heart",
  "bx bx-star",
  "bx bx-user-check",
  "bx bx-home-smile",
];

export const DEFAULT_HOME = {
  hero: {
    // When on, a "% OFF" slide is generated from the deepest real markdown and
    // shown first. It disappears by itself once nothing is reduced.
    autoDeal: true,
    autoplayMs: 7000,
    slides: [
      {
        id: "same-day",
        kicker: "Order by 4pm",
        // Shown in place of the kicker while same-day ordering is still open.
        countdown: true,
        display: "Same day",
        script: "Picked this morning, on your table tonight",
        lead:
          "Fruit, vegetables, dairy and bakery bought in small daily lots from local growers — never long-life bulk.",
        ctaLabel: "Start shopping",
        ctaHref: "/catalog",
        image: "",
      },
      {
        id: "fresh",
        kicker: "From local growers",
        countdown: false,
        display: "Fresh daily",
        // {aisle} is replaced with the name of the first aisle on the storefront.
        script: "Straight into {aisle}",
        lead:
          "The shelves change with the season, because we buy what the growers picked this week.",
        ctaLabel: "Browse the aisles",
        ctaHref: "/catalog",
        image: "",
      },
    ],
  },

  promises: [
    {
      id: "delivery",
      icon: "bx bx-cycling",
      title: "Same-day delivery",
      note: "Order by 4pm, eat it tonight.",
      href: "/policy?tab=delivery",
    },
    {
      id: "freshness",
      icon: "bx bx-check-shield",
      title: "Freshness promise",
      note: "Not fresh? We replace it.",
      href: "/policy?tab=freshness",
    },
    {
      id: "cod",
      icon: "bx bx-wallet",
      title: "Cash on delivery",
      note: "Pay when the basket arrives.",
      href: "/policy?tab=cod",
    },
    {
      id: "rewards",
      icon: "bx bx-gift",
      title: "Weekly rewards",
      note: "Points on every basket.",
      href: "/policy?tab=rewards",
    },
  ],

  // Heading copy per home section. Keys match HOME_SECTIONS in the settings
  // slice, so switching a section off and renaming it live side by side.
  headings: {
    aisles: { kicker: "Shop by aisle", title: "Explore our collections", note: "", linkLabel: "View all aisles" },
    deals: { kicker: "Reduced this week", title: "Deals this week", note: "Marked down and use-it-soon", linkLabel: "See all" },
    fresh: { kicker: "Just landed", title: "Fresh in today", note: "Newest on the shelf", linkLabel: "See all" },
    steps: { kicker: "How it works", title: "From basket to doorstep, today", note: "", linkLabel: "" },
    everything: { kicker: "In store now", title: "Popular in store", note: "", linkLabel: "Shop all" },
    blog: { kicker: "Reading", title: "From the blog", note: "Recipes and seasonal notes", linkLabel: "All articles" },
  },

  mosaic: {
    // Auto tiles follow the shelves: deepest markdown, the deals shelf, a
    // stocked aisle and the newest arrival. Turn it off to write all four.
    auto: true,
    tiles: [
      {
        id: "tile-1",
        variant: "tall",
        kicker: "Weekly shop",
        title: "Everything on the list",
        headline: "One",
        headlineNote: "delivery",
        icon: "bx bx-basket",
        href: "/catalog",
        image: "",
      },
      {
        id: "tile-2",
        variant: "wide",
        kicker: "This week in store",
        title: "Fresh in every",
        headline: "Morning",
        headlineNote: "",
        icon: "bx bx-time-five",
        href: "/catalog",
        image: "",
      },
      {
        id: "tile-3",
        variant: "dark",
        kicker: "No card needed",
        title: "Cash on delivery",
        headline: "",
        headlineNote: "",
        icon: "bx bx-wallet",
        href: "/policy?tab=cod",
        image: "",
      },
      {
        id: "tile-4",
        variant: "right",
        kicker: "New arrival",
        title: "Just off the van",
        headline: "",
        headlineNote: "",
        icon: "bx bx-package",
        href: "/catalog",
        image: "",
      },
    ],
  },

  steps: [
    {
      id: "step-1",
      icon: "bx bx-search-alt",
      title: "Fill your basket",
      body:
        "Browse the aisles or search for what you need. Prices are per pack, with the price per kilo shown beside them.",
    },
    {
      id: "step-2",
      icon: "bx bx-basket",
      title: "We pick it fresh",
      body:
        "Your order is picked by hand the same morning, date-checked, and packed cold where it needs to be.",
    },
    {
      id: "step-3",
      icon: "bx bx-cycling",
      title: "Delivered today",
      // {cutoff} is replaced with the same-day cut-off from Contact details.
      body:
        "Order before {cutoff} and it arrives the same day. Pay the driver in cash or by card at the door.",
    },
  ],

  rewards: {
    kicker: "Weekly rewards",
    title: "Points on every basket, money off the next one",
    body:
      "Members see the market deals a day early — which matters on the produce that sells out first.",
    ctaLabel: "Join free",
    ctaHref: "/login",
    linkLabel: "How it works",
    linkHref: "/policy?tab=rewards",
    points: [
      { id: "point-1", icon: "bx bx-purchase-tag", title: "Early access", note: "Deals a day before everyone else" },
      { id: "point-2", icon: "bx bx-list-check", title: "Saved baskets", note: "Reorder the weekly shop in one tap" },
      { id: "point-3", icon: "bx bx-medal", title: "Points that keep", note: "No expiry while the account is active" },
    ],
  },

  closer: {
    title: "Ready when you are",
    body: "",
    primaryLabel: "Start shopping",
    primaryHref: "/catalog",
    ghostLabel: "Talk to us",
    ghostHref: "/contact",
  },
};

/** A blank row for each repeatable list, used by the dashboard "add" buttons. */
export const BLANK = {
  slide: {
    kicker: "",
    countdown: false,
    display: "",
    script: "",
    lead: "",
    ctaLabel: "Shop now",
    ctaHref: "/catalog",
    image: "",
  },
  promise: { icon: "bx bx-check-shield", title: "", note: "", href: "" },
  step: { icon: "bx bx-basket", title: "", body: "" },
  point: { icon: "bx bx-star", title: "", note: "" },
};

/** The four mosaic slots, in the order they are drawn. */
export const MOSAIC_VARIANTS = [
  { value: "tall", label: "Left, full height" },
  { value: "wide", label: "Middle, top" },
  { value: "dark", label: "Middle, bottom (dark)" },
  { value: "right", label: "Right, full height" },
];

const isBlank = (value) =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "");

/** Stored value when it says something, otherwise the default. */
export const orDefault = (value, fallback) => (isBlank(value) ? fallback : value);

/**
 * Merge a stored `home` object over the defaults. Lists are taken wholesale
 * when present (the shopkeeper may legitimately want two slides, not three);
 * objects are merged key by key so a field added in a later release always has
 * a value.
 */
export function withHomeDefaults(stored = {}) {
  const d = DEFAULT_HOME;
  const s = stored || {};

  const list = (value, fallback) => (Array.isArray(value) && value.length ? value : fallback);

  return {
    hero: {
      ...d.hero,
      ...(s.hero || {}),
      slides: list(s.hero?.slides, d.hero.slides),
    },
    promises: list(s.promises, d.promises),
    headings: Object.fromEntries(
      Object.entries(d.headings).map(([key, value]) => [key, { ...value, ...(s.headings?.[key] || {}) }])
    ),
    mosaic: {
      ...d.mosaic,
      ...(s.mosaic || {}),
      tiles: list(s.mosaic?.tiles, d.mosaic.tiles),
    },
    steps: list(s.steps, d.steps),
    rewards: {
      ...d.rewards,
      ...(s.rewards || {}),
      points: list(s.rewards?.points, d.rewards.points),
    },
    closer: { ...d.closer, ...(s.closer || {}) },
  };
}

/** Heading copy for a section, with the defaults filling any blank field. */
export function headingOf(home, key) {
  const fallback = DEFAULT_HOME.headings[key] || {};
  const stored = home?.headings?.[key] || {};
  return {
    kicker: orDefault(stored.kicker, fallback.kicker),
    title: orDefault(stored.title, fallback.title),
    note: isBlank(stored.note) ? fallback.note : stored.note,
    linkLabel: orDefault(stored.linkLabel, fallback.linkLabel),
  };
}
