import { isPaypalOrderId, paypalCustomId } from "../../../data/paypal";
import { capturePaypalOrder, getPaypalOrder, paypalIssue } from "../../../lib/server/paypal";
import { readPurchase, verifyUser } from "../../../lib/server/staffFirestore";

/**
 * Takes the money for an order the customer approved. Only for their own order,
 * and only once its purchase is on record.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ reason: "method_not_allowed" });

  const idToken = (req.headers.authorization || "").replace(/^Bearer /, "");
  const { orderId } = req.body || {};
  if (!idToken) return res.status(401).json({ reason: "not_signed_in" });
  if (!isPaypalOrderId(orderId)) return res.status(400).json({ reason: "bad_request" });

  try {
    const user = await verifyUser(idToken);
    if (!user) return res.status(401).json({ reason: "not_signed_in" });

    const purchase = await readPurchase(orderId, idToken);
    if (!purchase) return res.status(409).json({ reason: "no_purchase" });

    const order = await getPaypalOrder(orderId);
    if (!order.ok) return res.status(404).json({ reason: "order_not_found" });
    if (order.data.purchase_units?.[0]?.custom_id !== paypalCustomId(user.uid, purchase.offerId)) {
      return res.status(403).json({ reason: "not_yours" });
    }
    if (order.data.status === "COMPLETED") return res.status(200).json({ status: "COMPLETED" });

    const capture = await capturePaypalOrder(orderId);
    if (!capture.ok) {
      const issue = paypalIssue(capture);
      console.error("PayPal refused a capture:", issue);
      return res.status(422).json({ reason: issue === "INSTRUMENT_DECLINED" ? "declined" : "paypal_refused" });
    }
    return res.status(200).json({ status: capture.data.status });
  } catch (err) {
    console.error("PayPal capture error:", err.message);
    return res.status(502).json({ reason: "paypal_unavailable" });
  }
}
