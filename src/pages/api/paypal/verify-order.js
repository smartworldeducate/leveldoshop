import { isAdmin } from "../../../lib/admins";
import { isPaypalOrderId, paypalCapture, paypalPaymentProblem } from "../../../data/paypal";
import { getPaypalOrder } from "../../../lib/server/paypal";
import { isDashboardUser, readPurchase, verifyUser } from "../../../lib/server/staffFirestore";

/** Staff only: PayPal's own answer on whether a purchase has really been paid. */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ reason: "method_not_allowed" });

  const idToken = (req.headers.authorization || "").replace(/^Bearer /, "");
  const { purchaseId } = req.body || {};
  if (!idToken) return res.status(401).json({ reason: "not_signed_in" });
  if (!isPaypalOrderId(purchaseId)) return res.status(400).json({ reason: "bad_request" });

  try {
    const user = await verifyUser(idToken);
    if (!user) return res.status(401).json({ reason: "not_signed_in" });
    if (!isAdmin(user) && !(await isDashboardUser(user.email, idToken))) {
      return res.status(403).json({ reason: "not_staff" });
    }

    const purchase = await readPurchase(purchaseId, idToken);
    if (!purchase) return res.status(404).json({ reason: "not_found" });

    const order = await getPaypalOrder(purchase.paypalOrderId);
    const problem = paypalPaymentProblem(order.ok ? order.data : null, {
      price: purchase.price,
      uid: purchase.buyer?.uid,
      offerId: purchase.offerId,
    });
    const capture = order.ok ? paypalCapture(order.data) : null;
    return res.status(200).json({
      paid: !problem,
      problem,
      amount: capture?.amount?.value || null,
      currency: capture?.amount?.currency_code || null,
      captureId: capture?.id || null,
      payerEmail: order.data?.payer?.email_address || null,
    });
  } catch (err) {
    console.error("PayPal verify error:", err.message);
    return res.status(502).json({ reason: "paypal_unavailable" });
  }
}
