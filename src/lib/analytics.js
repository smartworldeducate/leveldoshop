// ============================================================
// Store analytics — every number the dashboard shows is derived
// here from the real `order` and `products` collections. No page
// computes its own totals, so the tiles, charts and reports can
// never disagree with each other.
// ============================================================

import {
  LOW_STOCK_THRESHOLD,
  categoryAccent,
  categoryLabel,
  expiryState,
} from "@/data/grocery";

/** Firestore Timestamp | Date | string | number → Date (or null). */
export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const orderDate = (order) => toDate(order?.createdAt);

export const orderTotal = (order) => Number(order?.totalPrice) || 0;

export const orderUnits = (order) =>
  (order?.cartItems || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

export const isCompleted = (order) => order?.status === "completed";

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const dayKey = (d) => startOfDay(d).toISOString().slice(0, 10);

// -------------------- ranges -------------------- //

export const RANGES = {
  week: { label: "7 days", days: 7 },
  month: { label: "30 days", days: 30 },
  year: { label: "12 months", days: 365 },
};

/** Orders placed within the last `days` days. */
export function ordersInRange(orders, days) {
  const cutoff = startOfDay(new Date());
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return (orders || []).filter((o) => {
    const d = orderDate(o);
    return d && d >= cutoff;
  });
}

/**
 * Revenue time series for a range. Days for week/month, months for year, so
 * the x-axis never renders 365 ticks.
 */
export function revenueSeries(orders, rangeKey = "week") {
  const { days } = RANGES[rangeKey] || RANGES.week;

  if (rangeKey === "year") {
    const labels = [];
    const buckets = new Map();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      labels.push(d.toLocaleString("en-US", { month: "short" }));
      buckets.set(key, 0);
    }
    (orders || []).forEach((o) => {
      const d = orderDate(o);
      if (!d) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (buckets.has(key)) buckets.set(key, buckets.get(key) + orderTotal(o));
    });
    return { labels, values: [...buckets.values()] };
  }

  const labels = [];
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - i);
    buckets.set(dayKey(d), 0);
    labels.push(
      days > 7
        ? d.toLocaleDateString("en-US", { day: "numeric", month: "short" })
        : d.toLocaleDateString("en-US", { weekday: "short" })
    );
  }
  (orders || []).forEach((o) => {
    const d = orderDate(o);
    if (!d) return;
    const key = dayKey(d);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + orderTotal(o));
  });

  return { labels, values: [...buckets.values()] };
}

/** Percentage change of this window against the one immediately before it. */
export function trendVsPrevious(orders, days) {
  const now = startOfDay(new Date());
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - days);

  let current = 0;
  let previous = 0;
  (orders || []).forEach((o) => {
    const d = orderDate(o);
    if (!d) return;
    if (d >= start) current += orderTotal(o);
    else if (d >= prevStart) previous += orderTotal(o);
  });

  if (!previous) return current ? { percent: 100, up: true } : { percent: 0, up: true };
  const percent = Math.round(((current - previous) / previous) * 100);
  return { percent: Math.abs(percent), up: percent >= 0 };
}

// -------------------- headline numbers -------------------- //

export function storeKpis(orders = [], products = []) {
  const revenue = orders.reduce((sum, o) => sum + orderTotal(o), 0);
  const pending = orders.filter((o) => !isCompleted(o));
  const lowStock = products.filter(
    (p) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= LOW_STOCK_THRESHOLD
  );
  const outOfStock = products.filter((p) => (Number(p.stock) || 0) <= 0);
  const expiring = products.filter((p) => ["soon", "expired"].includes(expiryState(p.expiry)?.key));
  const stockValue = products.reduce(
    (sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0),
    0
  );

  return {
    revenue,
    orders: orders.length,
    pending: pending.length,
    completed: orders.length - pending.length,
    products: products.length,
    lowStock: lowStock.length,
    outOfStock: outOfStock.length,
    expiring: expiring.length,
    stockValue,
    averageOrder: orders.length ? revenue / orders.length : 0,
    trend: trendVsPrevious(orders, 7),
  };
}

// -------------------- breakdowns -------------------- //

/** Best sellers by units sold, joined back to the product for image/category. */
export function topProducts(orders = [], products = [], limit = 5) {
  const byId = new Map();
  orders.forEach((o) => {
    (o.cartItems || []).forEach((item) => {
      const key = item.productId || item.title;
      if (!key) return;
      const row = byId.get(key) || { key, title: item.title, units: 0, revenue: 0 };
      row.units += Number(item.quantity) || 0;
      row.revenue += (Number(item.quantity) || 0) * (Number(item.price) || 0);
      byId.set(key, row);
    });
  });

  return [...byId.values()]
    .map((row) => {
      const product = products.find((p) => p.id === row.key);
      return {
        ...row,
        image: product?.images?.[0] || null,
        categorySlug: product?.categorySlug || null,
        stock: product?.stock ?? null,
      };
    })
    .sort((a, b) => b.units - a.units)
    .slice(0, limit);
}

/** Revenue per category, biggest first, with zero-revenue categories dropped. */
export function categoryBreakdown(orders = [], products = [], categories = []) {
  const totals = new Map();
  orders.forEach((o) => {
    (o.cartItems || []).forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      const slug = product?.categorySlug || "uncategorised";
      const value = (Number(item.quantity) || 0) * (Number(item.price) || 0);
      totals.set(slug, (totals.get(slug) || 0) + value);
    });
  });

  const rows = [...totals.entries()].map(([slug, revenue]) => ({
    slug,
    name: categoryLabel(categories, slug),
    revenue,
    accent: categoryAccent(categories, slug),
  }));
  const total = rows.reduce((sum, r) => sum + r.revenue, 0) || 1;

  return rows
    .map((r) => ({ ...r, share: Math.round((r.revenue / total) * 100) }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Catalogue counts per category — used by the Categories page. */
export function categoryStats(products = [], categories = []) {
  return categories.map((cat) => {
    const items = products.filter((p) => p.categorySlug === cat.slug);
    return {
      ...cat,
      count: items.length,
      outOfStock: items.filter((p) => (Number(p.stock) || 0) <= 0).length,
      lowStock: items.filter(
        (p) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= LOW_STOCK_THRESHOLD
      ).length,
      stockValue: items.reduce(
        (sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0),
        0
      ),
    };
  });
}

/** One row per customer, keyed on email, newest order first. */
export function customersFromOrders(orders = []) {
  const byEmail = new Map();

  orders.forEach((o) => {
    const email = o.user?.email?.toLowerCase();
    if (!email) return;
    const date = orderDate(o);
    const row = byEmail.get(email) || {
      email,
      name: o.user?.name || "—",
      phone: o.user?.phone || "",
      city: o.user?.city || "",
      address: o.user?.address || "",
      orders: 0,
      spend: 0,
      lastOrder: null,
    };
    row.orders += 1;
    row.spend += orderTotal(o);
    if (date && (!row.lastOrder || date > row.lastOrder)) {
      row.lastOrder = date;
      row.name = o.user?.name || row.name;
      row.phone = o.user?.phone || row.phone;
      row.city = o.user?.city || row.city;
      row.address = o.user?.address || row.address;
    }
    byEmail.set(email, row);
  });

  return [...byEmail.values()].sort((a, b) => (b.lastOrder || 0) - (a.lastOrder || 0));
}

/**
 * Everything worth telling the shopkeeper about, newest / most urgent first.
 * Powers the Alerts page and the sidebar badge.
 */
export function storeAlerts(orders = [], products = []) {
  const alerts = [];

  products.forEach((p) => {
    const stock = Number(p.stock) || 0;
    if (stock <= 0) {
      alerts.push({
        id: `out-${p.id}`,
        tone: "danger",
        title: "Out of stock",
        body: `${p.title} has sold out — restock to keep it listed.`,
        href: "/dashboard/inventory",
        weight: 3,
      });
    } else if (stock <= LOW_STOCK_THRESHOLD) {
      alerts.push({
        id: `low-${p.id}`,
        tone: "warning",
        title: "Low stock",
        body: `${p.title} is down to ${stock} units.`,
        href: "/dashboard/inventory",
        weight: 2,
      });
    }

    const expiry = expiryState(p.expiry);
    if (expiry?.key === "expired") {
      alerts.push({
        id: `expired-${p.id}`,
        tone: "danger",
        title: "Past best-before",
        body: `${p.title} expired — pull it from the shelf.`,
        href: "/dashboard/inventory",
        weight: 4,
      });
    } else if (expiry?.key === "soon") {
      alerts.push({
        id: `expiring-${p.id}`,
        tone: "warning",
        title: "Expiring soon",
        body: `${p.title} expires in ${expiry.days} day${expiry.days === 1 ? "" : "s"}.`,
        href: "/dashboard/inventory",
        weight: 2,
      });
    }
  });

  orders
    .filter((o) => !isCompleted(o))
    .forEach((o) => {
      alerts.push({
        id: `order-${o.id}`,
        tone: "info",
        title: "Order awaiting fulfilment",
        body: `${o.user?.name || "A customer"} ordered ${orderUnits(o)} item(s).`,
        href: "/dashboard/orders",
        date: orderDate(o),
        weight: 3,
      });
    });

  return alerts.sort((a, b) => b.weight - a.weight || (b.date || 0) - (a.date || 0));
}

/** Relative time for feeds: "5 min ago". */
export function timeAgo(date) {
  const d = toDate(date);
  if (!d) return "—";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString();
}

/** Short absolute date for tables: "7 Aug 2026". */
export function formatDate(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export function formatDateTime(value) {
  const d = toDate(value);
  return d
    ? d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}
