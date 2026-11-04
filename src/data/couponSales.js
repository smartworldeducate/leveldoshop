// ============================================================
// Coupon sales — coupons customers pay for.
//
//   couponOffers/{id}        what is on sale (not usable as a code)
//   couponPurchases/{id}     pending → confirmed / rejected; confirmed → revoked
//
// The site takes no card payments, so a customer pays by the store's own
// method and gives a reference. Staff check the money arrived and confirm,
// which creates a single-use code in `coupons`. Pure, like the other rules.
// ============================================================

import { formatMoney } from "./grocery";
import { describeDiscount } from "./coupons";

export const EMPTY_OFFER = {
  title: "",
  description: "",
  price: "",
  type: "percent",
  value: "",
  maxDiscount: "",
  minOrder: "",
  categorySlugs: [],
  validDays: "30",
  stock: "",
  rewardText: "",
  rewardDay: "",
  enabled: true,
};

export const DEFAULT_COUPON_SHOP = { enabled: false, methods: [], checkTime: "" };

export const PURCHASE_STATUS = {
  pending: { label: "To check", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  revoked: { label: "Cancelled", tone: "neutral" },
};

/** What each kind of method asks for. Wallets need a number; a bank also needs its name. */
export const PAYMENT_TYPES = [
  { value: "jazzcash", label: "JazzCash", numberLabel: "JazzCash number", placeholder: "0300 1234567" },
  { value: "easypaisa", label: "Easypaisa", numberLabel: "Easypaisa number", placeholder: "0345 1234567" },
  { value: "bank", label: "Bank transfer", numberLabel: "IBAN or account number", placeholder: "PK36 SCBL 0000 0011 2345 6702" },
  { value: "other", label: "Other", numberLabel: "Account number (optional)", placeholder: "" },
];

export const EMPTY_METHOD = { id: "", type: "", name: "", accountName: "", accountNumber: "", bankName: "", note: "" };

/** A saved method back into the form. Older ones were one block of text, which becomes the note. */
export function methodToForm(method) {
  const known = PAYMENT_TYPES.find((t) => t.value === method.type || t.label.toLowerCase() === String(method.name || "").trim().toLowerCase());
  if (method.type) return { ...EMPTY_METHOD, ...method };
  return { ...EMPTY_METHOD, id: method.id, type: known?.value || "other", name: method.name || "", note: method.details || "" };
}

/** What gets saved. `details` is the text customers read and the older screens rely on. */
export function methodFields(form) {
  const type = PAYMENT_TYPES.find((t) => t.value === form.type);
  const clean = (value) => String(value || "").trim();
  const bankName = form.type === "bank" ? clean(form.bankName) : "";
  const name = form.type === "other" ? clean(form.name) : bankName || type?.label || "";
  const lines = [
    clean(form.accountName) && `Account name: ${clean(form.accountName)}`,
    clean(form.accountNumber) && `Number: ${clean(form.accountNumber)}`,
    clean(form.note),
  ];
  return {
    id: form.id,
    type: form.type,
    name,
    accountName: clean(form.accountName),
    accountNumber: clean(form.accountNumber),
    bankName,
    note: clean(form.note),
    details: lines.filter(Boolean).join("\n"),
  };
}

export function methodErrors(form) {
  const errors = {};
  const digits = String(form.accountNumber || "").replace(/\W/g, "");
  if (form.type === "other") {
    if (!String(form.name || "").trim()) errors.name = "Give this method a name";
    if (!digits && !String(form.note || "").trim()) errors.note = "Tell customers where to send the money";
    return errors;
  }
  if (form.type === "bank" && !String(form.bankName || "").trim()) errors.bankName = "Enter the bank's name";
  if (!String(form.accountName || "").trim()) errors.accountName = "Enter the name on the account";
  if (digits.length < 10) errors.accountNumber = "Enter the full number, so customers know where to send the money";
  return errors;
}

/** Saved but gives no account to pay into, so a customer would be stuck. */
export const methodLacksAccount = (method) => !method.accountNumber && !accountToCopy(method.details);

/** The methods a customer can choose from: complete rows only. */
export function paymentMethods(shop) {
  const listed = (shop?.methods || []).filter((m) => String(m.name || "").trim() && String(m.details || "").trim());
  // Saved before methods existed: one block of free text.
  if (!listed.length && String(shop?.instructions || "").trim()) {
    return [{ id: "payment", name: "Payment", details: shop.instructions }];
  }
  return listed;
}

/** The shop only opens once there are payment details to show customers. */
export const couponShopIsOpen = (shop) => Boolean(shop?.enabled && paymentMethods(shop).length);

/** A calendar date as stored on a reward day, in local time. */
export function todayKey(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const rewardDayPassed = (offer, now = new Date()) =>
  Boolean(offer?.rewardText && offer.rewardDay && offer.rewardDay < todayKey(now));

export function offerStatus(offer, now = new Date()) {
  if (offer?.enabled === false) return { key: "off", label: "Off sale", tone: "neutral" };
  // It can't keep its promise any more, so it stops selling by itself.
  if (rewardDayPassed(offer, now)) return { key: "ended", label: "Reward day passed", tone: "neutral" };
  if (offer?.stock > 0 && (offer.soldCount || 0) >= offer.stock) {
    return { key: "sold_out", label: "Sold out", tone: "warning" };
  }
  return { key: "on_sale", label: "On sale", tone: "success" };
}

export function offerFields(form) {
  const number = (value) => (Number(value) > 0 ? Number(value) : 0);
  return {
    title: String(form.title || "").trim(),
    description: String(form.description || "").trim(),
    price: Number(form.price) || 0,
    type: form.type,
    value: Number(form.value) || 0,
    maxDiscount: form.type === "percent" ? number(form.maxDiscount) : 0,
    minOrder: number(form.minOrder),
    categorySlugs: form.categorySlugs || [],
    validDays: Math.floor(number(form.validDays)),
    stock: Math.floor(number(form.stock)),
    rewardText: String(form.rewardText || "").trim(),
    rewardDay: form.rewardDay || "",
    enabled: form.enabled !== false,
  };
}

export function offerErrors(form, now = new Date()) {
  const errors = {};
  const value = Number(form.value);
  if (!String(form.title || "").trim()) errors.title = "Give it a name";
  if (!(Number(form.price) > 0)) errors.price = "Enter a price above 0";
  if (!(value > 0)) errors.value = "Enter an amount above 0";
  else if (form.type === "percent" && value > 100) errors.value = "A percentage can't be over 100";
  const rewardText = String(form.rewardText || "").trim();
  if (rewardText && !form.rewardDay) errors.rewardDay = "Choose the reward day";
  else if (rewardText && form.rewardDay < todayKey(now)) errors.rewardDay = "Choose today or a later day";
  if (form.rewardDay && !rewardText) errors.rewardText = "Say what every buyer gets";
  return errors;
}

/** Offers a customer can buy now: the shop is open and they aren't off sale or sold out. */
export const offersOnSale = (offers = [], shop) =>
  couponShopIsOpen(shop) ? offers.filter((o) => offerStatus(o).key === "on_sale") : [];

/** A reward day is a calendar date, so it's read in local time. */
export const formatRewardDay = (day) =>
  day
    ? new Date(`${day}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";

/** "today", "tomorrow", "in 5 days", or nothing once the day has gone. */
export function dayCountdown(day, now = new Date()) {
  if (!day) return "";
  const today = new Date(`${todayKey(now)}T00:00:00`);
  const days = Math.round((new Date(`${day}T00:00:00`) - today) / 86_400_000);
  if (days < 0) return "";
  if (days === 0) return "today";
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

/** How many are left, or null when there's no limit. */
export const offerLeft = (offer) =>
  offer?.stock > 0 ? Math.max(0, offer.stock - (offer.soldCount || 0)) : null;

/**
 * The part of a method's details a customer pastes into their payment app: the
 * IBAN or account number. Null when there isn't one, so they copy the whole text.
 */
export function accountToCopy(details) {
  const text = String(details || "");
  const iban = text.match(/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/);
  if (iban) return iban[0];
  const numbers = (text.match(/\+?\d[\d -]{5,}\d/g) || []).map((n) => n.replace(/[ -]/g, ""));
  return numbers.sort((a, b) => b.length - a.length)[0] || null;
}

/** Matches a purchase on anything staff might have in front of them. */
export function purchaseMatches(purchase, term) {
  const text = String(term || "").trim().toLowerCase();
  if (!text) return true;
  const { buyer = {}, token, reference, couponCode, offerTitle } = purchase;
  return [buyer.name, buyer.phone, buyer.email, token, reference, couponCode, offerTitle]
    .some((value) => String(value || "").toLowerCase().includes(text));
}

/** Who has waited longest, skipping the purchase just dealt with. */
export function nextToCheck(purchases = [], exceptId) {
  const seconds = (p) => p.createdAt?.seconds ?? new Date(p.createdAt || 0).getTime() / 1000;
  return purchases
    .filter((p) => p.status === "pending" && p.id !== exceptId)
    .sort((a, b) => seconds(a) - seconds(b))[0] || null;
}

/** Buyers on the reward-day list: confirmed purchases that carry a reward, soonest first. */
export const rewardList = (purchases = []) =>
  purchases
    .filter((p) => p.status === "confirmed" && p.reward?.text)
    .sort((a, b) => String(a.reward.day).localeCompare(String(b.reward.day)));

/** One row per reward day, soonest first, for planning what to have ready. */
export function rewardDays(list = []) {
  const days = {};
  list.forEach((p) => {
    const row = days[p.reward.day] || (days[p.reward.day] = { day: p.reward.day, total: 0, waiting: 0 });
    row.total += 1;
    if (!p.rewardGivenAt) row.waiting += 1;
  });
  return Object.values(days).sort((a, b) => a.day.localeCompare(b.day));
}

/** Names and phones come from customers, so nothing may run as a spreadsheet formula. */
const csvCell = (value) => {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const toCsv = (rows) => rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

export function rewardListCsv(list = []) {
  const rows = list.map((p) => [
    p.buyer?.name,
    p.buyer?.phone,
    p.reward.text,
    p.offerTitle,
    p.reward.day,
    p.rewardGivenAt ? "Given" : "To give",
  ]);
  return toCsv([["Buyer", "Phone", "Reward", "Bought", "Reward day", "Status"], ...rows]);
}

export function rewardMessage(purchase) {
  const name = purchase.buyer?.name?.trim() || "there";
  return `Hello ${name}, your reward for buying "${purchase.offerTitle}" is ready: ${purchase.reward.text}. Reward day: ${formatRewardDay(purchase.reward.day)}. Please reply to arrange it.`;
}

/** Random and unguessable: this code is worth money. Skips look-alike characters. */
export function generatePurchaseCode(random = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = random(10);
  return `BUY${Array.from(bytes, (b) => letters[b % letters.length]).join("")}`;
}

/** Identifies one purchase, so staff can match a payment to it. Not a discount code. */
export function generateToken(random = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return `TKN-${Array.from(random(6), (b) => letters[b % letters.length]).join("")}`;
}

export const isValidToken = (token) => /^TKN-[A-Z2-9]{6}$/.test(String(token));

/** The single-use coupon a confirmed purchase turns into. */
export function purchasedCoupon(offer, purchase, { now = new Date() } = {}) {
  const endsAt = offer.validDays > 0 ? new Date(now.getTime() + offer.validDays * 86_400_000).toISOString() : "";
  return {
    label: offer.title,
    type: offer.type,
    value: offer.value,
    maxDiscount: offer.maxDiscount || 0,
    minOrder: offer.minOrder || 0,
    startsAt: "",
    endsAt,
    usageLimit: 1,
    perCustomerLimit: 1,
    usedCount: 0,
    categorySlugs: offer.categorySlugs || [],
    enabled: true,
    showOnSite: false,
    purchaseId: purchase.id,
  };
}

/** References used on more than one purchase: staff should look twice. */
export function duplicateReferences(purchases = []) {
  const seen = {};
  purchases
    .filter((p) => p.status !== "rejected")
    .forEach((p) => {
      const key = String(p.reference || "").trim().toLowerCase();
      if (key) seen[key] = (seen[key] || 0) + 1;
    });
  return new Set(Object.keys(seen).filter((key) => seen[key] > 1));
}

/** What staff can send when a request comes in, before checking the money. */
export function receivedMessage(purchase, { checkTime, draw, drawDate } = {}) {
  const name = purchase.buyer?.name?.trim() || "there";
  const lines = [
    `Hello ${name}, we've received your payment details.`,
    `Token: ${purchase.token}`,
    `Coupon: ${purchase.offerTitle}`,
    `Amount: ${formatMoney(purchase.price)}`,
    `Paid by: ${purchase.paymentMethod}`,
    `We'll check your payment${checkTime ? ` within ${checkTime}` : ""}, then send your coupon code here.`,
  ];
  if (draw) {
    lines.push(`Separately, our free draw "${draw.title}" has results on ${drawDate}. Anyone can enter for free, and buying a coupon doesn't affect your chances.`);
  }
  return lines.join("\n");
}

export function purchaseMessage(purchase, ordersUrl) {
  const name = purchase.buyer?.name?.trim() || "there";
  const offer = purchase.coupon;
  const reward = purchase.reward?.text
    ? ` You're also on our reward-day list: ${purchase.reward.text} on ${formatRewardDay(purchase.reward.day)}.`
    : "";
  const until = offer?.endsAt
    ? ` It's valid until ${new Date(offer.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`
    : "";
  return `Hello ${name}, we've confirmed your payment of ${formatMoney(purchase.price)}. Your coupon code is ${purchase.couponCode} (${describeDiscount(offer)}).${until} Enter it in your basket at checkout.${reward}\n\nSee your coupons: ${ordersUrl}`;
}
