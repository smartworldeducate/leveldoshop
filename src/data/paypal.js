// ============================================================
// PayPal for coupon sales. Pure checks, shared by the server routes.
//
//   the server creates the order, so the price can't be changed in the browser
//   the customer approves it on PayPal
//   their purchase is saved under the PayPal order ID, then the money is taken
//   staff see PayPal's own answer before they confirm and issue the code
//
// Saving first means nobody can be charged with no purchase on record, and one
// order ID can only ever be one purchase.
// ============================================================

export const PAYPAL_CURRENCY = "USD";

export const isPaypalOrderId = (id) => /^[A-Z0-9]{10,25}$/.test(String(id));

/** Ties a PayPal order to who it was for and what they were buying. */
export const paypalCustomId = (uid, offerId) => `${uid}:${offerId}`;

export const toPaypalAmount = (price) => (Number(price) || 0).toFixed(2);

const firstUnit = (order) => order?.purchase_units?.[0];

export const paypalCapture = (order) => firstUnit(order)?.payments?.captures?.[0] || null;

/**
 * Why this PayPal order doesn't prove the purchase was paid, or null if it does.
 * Only ever trust the order PayPal returns, never anything sent by a browser.
 */
export function paypalPaymentProblem(order, { price, uid, offerId, currency = PAYPAL_CURRENCY }) {
  if (!order) return "PayPal has no record of this order";
  const unit = firstUnit(order);
  if (unit?.custom_id !== paypalCustomId(uid, offerId)) return "This PayPal order belongs to a different customer or coupon";
  const capture = paypalCapture(order);
  if (order.status !== "COMPLETED" || !capture) return "PayPal hasn't taken this money";
  if (capture.status !== "COMPLETED") return `PayPal says this payment is ${String(capture.status).toLowerCase().replace(/_/g, " ")}`;
  if (capture.amount?.currency_code !== currency) return `This was paid in ${capture.amount?.currency_code}, not ${currency}`;
  if (capture.amount?.value !== toPaypalAmount(price)) return `PayPal took ${capture.amount?.value}, but the coupon costs ${toPaypalAmount(price)}`;
  return null;
}
