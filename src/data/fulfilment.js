// ============================================================
// Fulfilment — an order's journey to the door, and what happens
// when it goes wrong on the way.
//
//   placed → confirmed → packed → on_the_way → delivered
//
// A problem is reported against the step the order is on and holds it
// there until staff resolve it: try again, deliver without the affected
// items, or cancel. Problems after delivery belong to returns.
//
// `order.status` stays pending / completed (now also cancelled), so an order
// without any of this is simply still at "placed". Everything here is pure:
// the slice runs it inside a Firestore transaction, on freshly read data.
// ============================================================

export const FULFILMENT_STEPS = ["placed", "confirmed", "packed", "on_the_way", "delivered"];

export const STEP_INFO = {
  placed: {
    label: "Placed",
    action: "Confirm order",
    hint: "Check the order, and call the customer if anything looks off.",
    customer: "We've received your order.",
  },
  confirmed: {
    label: "Confirmed",
    action: "Mark as packed",
    hint: "Pick and pack every item, and check each one as it goes in.",
    customer: "Your order is confirmed. We're picking your items.",
  },
  packed: {
    label: "Packed",
    action: "Send out for delivery",
    hint: "Hand the bags to the driver.",
    customer: "Your order is packed and waiting for a driver.",
  },
  on_the_way: {
    label: "On the way",
    action: "Mark as delivered",
    hint: "Confirm once the customer has the order. This takes the items out of stock.",
    customer: "Your order is on its way to you.",
  },
  delivered: { label: "Delivered", customer: "Your order has been delivered." },
};

/** `items: true` means the problem is about specific units in the basket. */
export const ISSUE_TYPES = {
  damaged: {
    label: "Items damaged",
    items: true,
    customer: "Some of your items were damaged, so we're sorting out what to do next.",
  },
  missing: {
    label: "Items missing",
    items: true,
    customer: "We couldn't find some of your items, so we're sorting out what to do next.",
  },
  out_of_stock: {
    label: "Out of stock",
    items: true,
    customer: "Some of your items have run out, so we're sorting out what to do next.",
  },
  customer_unavailable: {
    label: "Customer unavailable",
    customer: "We couldn't reach you. We'll try again soon.",
  },
  wrong_address: {
    label: "Address problem",
    customer: "We had trouble with your delivery address and will contact you.",
  },
  refused: {
    label: "Customer refused",
    customer: "The delivery wasn't accepted, so we're looking into it.",
  },
  other: {
    label: "Something else",
    customer: "We hit a problem with your order and are looking into it.",
  },
};

export const RESOLUTIONS = {
  retry: { label: "Fixed, carry on" },
  short: { label: "Deliver without these items" },
  cancel: { label: "Cancel the order" },
};

export const issuesOf = (order) => order?.issues || [];
export const openIssue = (order) => issuesOf(order).find((i) => i.status === "open") || null;
export const isCancelled = (order) => order?.status === "cancelled";

/** An order still heading to the customer. */
export const isOpenOrder = (order) => !["completed", "cancelled"].includes(order?.status);

export function stageOf(order) {
  if (order?.status === "completed") return "delivered";
  return order?.fulfilment?.stage || "placed";
}

export const nextStage = (order) => FULFILMENT_STEPS[FULFILMENT_STEPS.indexOf(stageOf(order)) + 1] || null;

export const stageHistory = (order) => order?.fulfilment?.history || [];

/** Units of each basket line that will not be delivered, keyed by line index. */
export function shortByLine(order) {
  const totals = {};
  issuesOf(order)
    .filter((i) => i.status === "resolved" && i.resolution === "short")
    .flatMap((i) => i.items || [])
    .forEach((item) => {
      totals[item.line] = (totals[item.line] || 0) + (Number(item.quantity) || 0);
    });
  return totals;
}

/** Units of a basket line the customer actually gets. */
export function deliveredQty(order, line) {
  const bought = Number(order?.cartItems?.[line]?.quantity) || 0;
  return Math.max(0, bought - (shortByLine(order)[line] || 0));
}

/** What one unit of a basket line really cost, after any coupon. */
export function unitPaid(item) {
  const price = Number(item?.price) || 0;
  const quantity = Number(item?.quantity) || 0;
  return quantity > 0 ? price - (Number(item?.discount) || 0) / quantity : price;
}

/** Money the customer no longer pays for undelivered items. */
export function shortValue(order) {
  const short = shortByLine(order);
  return (order?.cartItems || []).reduce(
    (sum, item, line) => sum + (short[line] || 0) * unitPaid(item),
    0
  );
}

/** One label + tone for an order, wherever its status is shown. */
export function orderStatusView(order) {
  if (isCancelled(order)) return { key: "cancelled", label: "Cancelled", tone: "neutral" };
  const issue = openIssue(order);
  if (issue) return { key: "problem", label: `Problem: ${STEP_INFO[issue.step]?.label}`, tone: "danger" };
  const stage = stageOf(order);
  if (stage === "delivered") return { key: "completed", label: "Completed", tone: "success" };
  return { key: stage, label: stage === "placed" ? "Pending" : STEP_INFO[stage].label, tone: stage === "placed" ? "warning" : "info" };
}

/** Every problem in the store, flattened with its order and newest first. */
export const allIssues = (orders = []) =>
  orders
    .flatMap((order) => issuesOf(order).map((issue) => ({ ...issue, order })))
    .sort((a, b) => String(b.reportedAt).localeCompare(String(a.reportedAt)));

/** Move an order on one step. Returns the fields to write and the new stage. */
export function advanceOrder(order, { at, by }) {
  if (isCancelled(order)) throw new Error("This order was cancelled");
  if (openIssue(order)) throw new Error("Resolve the problem on this order first");
  const stage = nextStage(order);
  if (!stage) throw new Error("This order was already delivered");

  const patch = {
    fulfilment: { stage, history: [...stageHistory(order), { stage, at, by }] },
  };
  if (stage === "delivered") {
    patch.status = "completed";
    patch.completedAt = at;
  }
  return { stage, patch };
}

/**
 * Record a problem against the order's current step.
 * `selection` is `{ [lineIndex]: quantity }`, required for item problems.
 */
export function reportIssue(order, { type, note = "", selection = {} }, { id, at, by }) {
  const info = ISSUE_TYPES[type];
  if (!info) throw new Error("Choose what went wrong");
  if (isCancelled(order)) throw new Error("This order was cancelled");
  if (stageOf(order) === "delivered") {
    throw new Error("This order was delivered, so start a return instead");
  }
  if (openIssue(order)) throw new Error("This order already has an open problem");
  if (type === "other" && !note.trim()) throw new Error("Say what went wrong");

  const items = !info.items
    ? []
    : Object.entries(selection)
        .map(([key, qty]) => ({ line: Number(key), quantity: Number(qty) }))
        .filter((row) => row.quantity > 0)
        .map(({ line, quantity }) => {
          const item = order.cartItems?.[line];
          if (!item) throw new Error("That item is no longer on the order");
          const left = deliveredQty(order, line);
          if (!Number.isInteger(quantity) || quantity > left) {
            throw new Error(`Only ${left} of ${item.title} left on this order`);
          }
          return {
            line,
            productId: item.productId || null,
            title: item.title || "",
            image: item.images?.[0] || null,
            price: unitPaid(item),
            quantity,
          };
        });

  if (info.items && !items.length) throw new Error("Choose the affected items");

  return {
    id,
    step: stageOf(order),
    type,
    note: note.trim(),
    items,
    status: "open",
    reportedAt: at,
    reportedBy: by,
  };
}

/**
 * Close a problem. Returns the fields to write plus `writeOff`, the units per
 * product to take out of stock now: damaged goods are gone however the problem
 * ends, and delivery only deducts what actually leaves with the customer.
 */
export function resolveIssue(order, issueId, { resolution, note = "" }, { at, by }) {
  const issue = issuesOf(order).find((i) => i.id === issueId);
  if (!issue) throw new Error("Problem not found");
  if (issue.status !== "open") throw new Error("This problem was already resolved");
  if (!RESOLUTIONS[resolution]) throw new Error("Choose how to resolve this");

  if (resolution === "short") {
    if (!issue.items?.length) throw new Error("This problem isn't about specific items");
    const affected = Object.fromEntries(issue.items.map((i) => [i.line, i.quantity]));
    const unitsLeft = (order.cartItems || []).reduce(
      (sum, _, line) => sum + deliveredQty(order, line) - (affected[line] || 0),
      0
    );
    if (unitsLeft <= 0) throw new Error("Nothing would be left to deliver, so cancel the order instead");
  }

  const resolved = {
    ...issue,
    status: "resolved",
    resolution,
    resolutionNote: note.trim(),
    resolvedAt: at,
    resolvedBy: by,
  };
  const patch = { issues: issuesOf(order).map((i) => (i.id === issueId ? resolved : i)) };
  if (resolution === "cancel") {
    patch.status = "cancelled";
    patch.cancelledAt = at;
  }

  const writeOff = {};
  if (issue.type === "damaged") {
    issue.items.forEach((item) => {
      if (item.productId) writeOff[item.productId] = (writeOff[item.productId] || 0) + item.quantity;
    });
  }
  return { patch, writeOff };
}
