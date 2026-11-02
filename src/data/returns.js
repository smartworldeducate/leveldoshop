// ============================================================
// Returns — the reverse side of an order.
//
//   requested → approved → received → refunded
//        └──────────┴→ rejected
//
// A completed order keeps its `completed` status; its returns live in an
// `order.returns` array, so reports, deleting an order and the rest of the
// order flow stay on one document. Everything here is pure: the slice runs
// these inside a Firestore transaction, against freshly read data.
// ============================================================

import { deliveredQty, shortValue } from "./fulfilment";

export const RETURN_REASONS = [
  { value: "damaged", label: "Damaged on arrival" },
  { value: "spoiled", label: "Spoiled or past best-before" },
  { value: "wrong-item", label: "Wrong item delivered" },
  { value: "changed-mind", label: "Change of mind" },
  { value: "other", label: "Other" },
];

export const REFUND_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "other", label: "Other" },
];

export const RETURN_STATUS = {
  requested: { label: "Requested", tone: "warning", customer: "We have your request and will review it shortly." },
  approved: { label: "Approved", tone: "info", customer: "Approved. We'll contact you about getting the items back." },
  received: { label: "Received", tone: "brand", customer: "Your items are back with us. Your refund is next." },
  refunded: { label: "Refunded", tone: "success", customer: "Your refund has been paid." },
  rejected: { label: "Rejected", tone: "neutral", customer: "We couldn't accept this return." },
};

/** The happy path, in order — what every progress tracker draws. */
export const RETURN_STEPS = ["requested", "approved", "received", "refunded"];

export const DEFAULT_RETURN_SETTINGS = { enabled: true, windowDays: 1 };

/** Which status each action may run from, and where it leads. */
const TRANSITIONS = {
  approve: { from: ["requested"], to: "approved" },
  reject: { from: ["requested", "approved"], to: "rejected" },
  receive: { from: ["approved"], to: "received" },
  refund: { from: ["received"], to: "refunded" },
};

export const shortOrderId = (id) => `#${String(id).slice(0, 6).toUpperCase()}`;

export const returnsOf = (order) => order?.returns || [];

export const isOpenReturn = (ret) => !["refunded", "rejected"].includes(ret?.status);

export const reasonLabel = (value) =>
  RETURN_REASONS.find((r) => r.value === value)?.label || value || "—";

export const methodLabel = (value) =>
  REFUND_METHODS.find((m) => m.value === value)?.label || value || "—";

export const returnValue = (ret) =>
  (ret?.items || []).reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.price) || 0),
    0
  );

/** Money actually handed back on this order. */
export const orderRefunded = (order) =>
  returnsOf(order)
    .filter((r) => r.status === "refunded")
    .reduce((sum, r) => sum + (Number(r.refund?.amount) || 0), 0);

/** What can still be refunded: the order total less undelivered items and refunds. */
export const refundableLeft = (order) =>
  Math.max(0, (Number(order?.totalPrice) || 0) - shortValue(order) - orderRefunded(order));

/** Units of each basket line already put back on the shelf, keyed by line index. */
export function restockedByLine(order) {
  const totals = {};
  returnsOf(order).forEach((ret) =>
    (ret.items || []).forEach((i) => {
      totals[i.line] = (totals[i.line] || 0) + (Number(i.restocked) || 0);
    })
  );
  return totals;
}

/** Units of a basket line still free to return; rejected returns give theirs back. */
export function returnableQty(order, line) {
  const bought = deliveredQty(order, line);
  const taken = returnsOf(order)
    .filter((r) => r.status !== "rejected")
    .flatMap((r) => r.items || [])
    .filter((i) => i.line === line)
    .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  return Math.max(0, bought - taken);
}

export const canStartReturn = (order) =>
  order?.status === "completed" &&
  (order.cartItems || []).some((_, line) => returnableQty(order, line) > 0);

/** Every return in the store, flattened with its order and newest first. */
export const allReturns = (orders = []) =>
  orders
    .flatMap((order) => returnsOf(order).map((ret) => ({ ...ret, order })))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

/** Whether a signed-in shopper placed this order (by account, or checkout email). */
export const ownsOrder = (order, user) =>
  Boolean(
    user &&
      ((order?.userId && order.userId === user.uid) ||
        (user.email && order?.user?.email?.trim().toLowerCase() === user.email.toLowerCase()))
  );

const millis = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value.seconds) return value.seconds * 1000;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
};

/** When the shopper's return window shuts, counted from completion (or null). */
export function returnDeadline(order, windowDays) {
  const from = millis(order?.completedAt) ?? millis(order?.createdAt);
  return from == null ? null : new Date(from + (Number(windowDays) || 0) * 86_400_000);
}

/** Why a shopper can't request a return right now, or null when they can. */
export function customerReturnBlock(order, settings = DEFAULT_RETURN_SETTINGS, now = new Date()) {
  if (settings.enabled === false) return "disabled";
  if (!canStartReturn(order)) return "unavailable";
  const deadline = returnDeadline(order, settings.windowDays);
  return deadline && now > deadline ? "expired" : null;
}

const stamp = (status, at, by, note = "") => ({ status, at, by, ...(note ? { note } : {}) });

/**
 * Build a return from the staff's selection.
 * `selection` is `{ [lineIndex]: quantity }`; throws when it can't be honoured.
 */
export function buildReturn(order, { selection, reason, note = "", source = "staff" }, { id, at, by }) {
  if (order?.status !== "completed") throw new Error("Only completed orders can be returned");
  if (!RETURN_REASONS.some((r) => r.value === reason)) throw new Error("Choose a reason");

  const items = Object.entries(selection || {})
    .map(([key, qty]) => ({ line: Number(key), quantity: Number(qty) }))
    .filter((row) => row.quantity > 0)
    .map(({ line, quantity }) => {
      const item = order.cartItems?.[line];
      if (!item) throw new Error("That item is no longer on the order");
      if (!Number.isInteger(quantity) || quantity > returnableQty(order, line)) {
        throw new Error(`Only ${returnableQty(order, line)} of ${item.title} can be returned`);
      }
      return {
        line,
        productId: item.productId || null,
        title: item.title || "",
        image: item.images?.[0] || null,
        price: Number(item.price) || 0,
        quantity,
        restocked: 0,
      };
    });

  if (!items.length) throw new Error("Choose at least one item to return");

  return {
    id,
    status: "requested",
    source,
    reason,
    note: note.trim(),
    items,
    createdAt: at,
    createdBy: by,
    history: [stamp("requested", at, by)],
  };
}

/**
 * Move a return on one step and return the new return.
 *
 * `receive` takes `restock: { [lineIndex]: units }` — how many of each line are
 * fit to sell again. `refund` takes `amount`, `method` and `reference`.
 * `refundCap` is what is left of the order total after earlier refunds.
 */
export function advanceReturn(ret, action, payload = {}, { at, by, refundCap = Infinity } = {}) {
  const step = TRANSITIONS[action];
  if (!step) throw new Error(`Unknown action: ${action}`);
  if (!step.from.includes(ret.status)) {
    throw new Error(`This return is already ${RETURN_STATUS[ret.status]?.label.toLowerCase()}`);
  }

  const next = {
    ...ret,
    status: step.to,
    history: [...(ret.history || []), stamp(step.to, at, by, (payload.note || "").trim())],
  };

  if (action === "reject" && !(payload.note || "").trim()) {
    throw new Error("Say why the return was rejected");
  }

  if (action === "receive") {
    next.items = ret.items.map((item) => {
      const units = Number(payload.restock?.[item.line]) || 0;
      if (!Number.isInteger(units) || units < 0 || units > item.quantity) {
        throw new Error(`Restock for ${item.title} must be between 0 and ${item.quantity}`);
      }
      return { ...item, restocked: units };
    });
  }

  if (action === "refund") {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount < 0) throw new Error("Enter the amount refunded");
    if (amount > refundCap + 0.001) {
      throw new Error(`Only ${refundCap.toFixed(2)} of this order is left to refund`);
    }
    if (!REFUND_METHODS.some((m) => m.value === payload.method)) {
      throw new Error("Choose how the refund was paid");
    }
    next.refund = {
      amount,
      method: payload.method,
      reference: (payload.reference || "").trim(),
      at,
      by,
    };
  }

  return next;
}

/** Units to add back per product for a return being received. */
export function restockTotals(ret) {
  const totals = {};
  (ret.items || []).forEach((item) => {
    if (item.productId && item.restocked > 0) {
      totals[item.productId] = (totals[item.productId] || 0) + item.restocked;
    }
  });
  return totals;
}
