// ============================================================
// Coupons — discount codes the shopkeeper controls from the dashboard.
//
// Stored in `coupons/{CODE}`, so a code is looked up directly and customers
// never need to list the collection. A code in use is counted on `usedCount`
// and per customer in `coupons/{CODE}/redemptions`. Everything here is pure:
// checkout runs it again inside a transaction, on freshly read data.
// ============================================================

import { formatMoney } from "./grocery";

export const COUPON_TYPES = [
  { value: "percent", label: "Percentage off" },
  { value: "fixed", label: "Fixed amount off" },
];

export const EMPTY_COUPON = {
  code: "",
  label: "",
  type: "percent",
  value: "",
  maxDiscount: "",
  minOrder: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  perCustomerLimit: "1",
  categorySlugs: [],
  enabled: true,
  showOnSite: false,
};

export const normalizeCode = (value) => String(value || "").trim().toUpperCase().replace(/\s+/g, "");

export const isValidCode = (code) => /^[A-Z0-9_-]{3,20}$/.test(code);

const toCents = (value) => Math.round((Number(value) || 0) * 100);

const prettyDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Where a coupon stands right now. One vocabulary for the dashboard and checkout. */
export function couponStatus(coupon, now = new Date()) {
  if (!coupon?.enabled) return { key: "off", label: "Switched off", tone: "neutral" };
  if (coupon.endsAt && now > new Date(coupon.endsAt)) return { key: "expired", label: "Expired", tone: "neutral" };
  if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
    return { key: "used_up", label: "Used up", tone: "warning" };
  }
  if (coupon.startsAt && now < new Date(coupon.startsAt)) return { key: "scheduled", label: "Scheduled", tone: "info" };
  return { key: "active", label: "Active", tone: "success" };
}

/** Days left on a live code that ends within `within` days, otherwise null. */
export function endsInDays(coupon, now = new Date(), within = 7) {
  if (!coupon?.endsAt || couponStatus(coupon, now).key !== "active") return null;
  const days = Math.ceil((new Date(coupon.endsAt) - now) / 86_400_000);
  return days <= within ? days : null;
}

/** "ends today", "ends tomorrow", "ends in 3 days". */
export const endsInLabel = (days) =>
  days <= 0 ? "Ends today" : days === 1 ? "Ends tomorrow" : `Ends in ${days} days`;

/**
 * The discount for a basket, as cents-exact money per line so it always adds up.
 * `lines` are `{ categorySlug, price, quantity }`.
 */
export function computeDiscount(coupon, lines = []) {
  const applies = (line) => !coupon?.categorySlugs?.length || coupon.categorySlugs.includes(line.categorySlug);
  const totals = lines.map((line) => toCents(line.price) * (Number(line.quantity) || 0));
  const eligible = lines.reduce((sum, line, i) => sum + (applies(line) ? totals[i] : 0), 0);

  let amount = 0;
  if (coupon?.type === "percent") {
    amount = Math.round((eligible * (Number(coupon.value) || 0)) / 100);
    if (Number(coupon.maxDiscount) > 0) amount = Math.min(amount, toCents(coupon.maxDiscount));
  } else if (coupon?.type === "fixed") {
    amount = Math.min(toCents(coupon.value), eligible);
  }

  // Share it across the eligible lines; the last one takes any rounding remainder.
  const lastEligible = lines.reduce((last, line, i) => (applies(line) ? i : last), -1);
  let left = amount;
  const perLine = lines.map((line, i) => {
    if (!applies(line) || eligible === 0) return 0;
    const share = i === lastEligible ? left : Math.round((amount * totals[i]) / eligible);
    left -= share;
    return share / 100;
  });

  return { eligible: eligible / 100, amount: amount / 100, perLine };
}

/** Why this coupon can't be used on this basket, in the customer's words, or null. */
export function couponProblem(coupon, lines, { now = new Date(), usedByCustomer = 0 } = {}) {
  if (!coupon) return "That code isn't valid.";
  const status = couponStatus(coupon, now);
  if (status.key === "off") return "That code isn't valid.";
  if (status.key === "expired") return "This code has expired.";
  if (status.key === "used_up") return "This code has been fully used.";
  if (status.key === "scheduled") return `This code starts on ${prettyDate(coupon.startsAt)}.`;

  if (coupon.perCustomerLimit && usedByCustomer >= coupon.perCustomerLimit) {
    return "You've already used this code.";
  }

  const { eligible } = computeDiscount(coupon, lines);
  if (eligible <= 0) return "This code doesn't apply to the items in your basket.";
  if (Number(coupon.minOrder) > 0 && eligible < Number(coupon.minOrder)) {
    return `Spend ${formatMoney(coupon.minOrder)} or more on eligible items to use this code.`;
  }
  return null;
}

/** "20% off, up to $5" / "$5 off". */
export function describeDiscount(coupon) {
  if (coupon?.type === "percent") {
    const cap = Number(coupon.maxDiscount) > 0 ? `, up to ${formatMoney(coupon.maxDiscount)}` : "";
    return `${Number(coupon.value) || 0}% off${cap}`;
  }
  return `${formatMoney(coupon?.value)} off`;
}

/** The conditions a customer needs to know, as short phrases. */
/** The discount split for a ticket's stub: the big number, and the word under it. */
export const discountStub = (coupon) => ({
  big: coupon?.type === "percent" ? `${Number(coupon.value) || 0}%` : formatMoney(coupon?.value).replace(/\.00$/, ""),
  small: "OFF",
});

export function describeTerms(coupon, categoryName = (slug) => slug) {
  const terms = [];
  if (Number(coupon?.minOrder) > 0) terms.push(`Spend ${formatMoney(coupon.minOrder)}+`);
  if (coupon?.categorySlugs?.length) terms.push(`${coupon.categorySlugs.map(categoryName).join(", ")} only`);
  if (coupon?.endsAt) terms.push(`Ends ${prettyDate(coupon.endsAt)}`);
  return terms;
}

/** Keys that count one customer's use: by email and by phone, so either catches a repeat. */
export function redemptionKeys({ email, phone }) {
  const clean = (value) => String(value || "").trim().toLowerCase().replace(/\//g, "_");
  return [email && `email:${clean(email)}`, phone && `phone:${clean(phone)}`].filter(Boolean);
}

/** Form → Firestore fields. Blank limits and dates are stored as "no limit". */
export function couponFields(form) {
  const number = (value) => (Number(value) > 0 ? Number(value) : 0);
  return {
    label: String(form.label || "").trim(),
    type: form.type,
    value: Number(form.value) || 0,
    maxDiscount: form.type === "percent" ? number(form.maxDiscount) : 0,
    minOrder: number(form.minOrder),
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : "",
    usageLimit: Math.floor(number(form.usageLimit)),
    perCustomerLimit: Math.floor(number(form.perCustomerLimit)),
    categorySlugs: form.categorySlugs || [],
    enabled: form.enabled !== false,
    showOnSite: Boolean(form.showOnSite),
  };
}

/** Form errors by field; empty when it can be saved. */
export function couponFormErrors(form, { isNew = true } = {}) {
  const errors = {};
  const value = Number(form.value);
  if (isNew && !isValidCode(normalizeCode(form.code))) {
    errors.code = "Use 3 to 20 letters, numbers, hyphens or underscores";
  }
  if (!(value > 0)) errors.value = "Enter an amount above 0";
  else if (form.type === "percent" && value > 100) errors.value = "A percentage can't be over 100";
  if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
    errors.endsAt = "The end must be after the start";
  }
  return errors;
}
