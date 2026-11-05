import { couponShopIsOpen, isValidToken, offerStatus } from "../../../data/couponSales";
import { createPaypalOrder, paypalIssue } from "../../../lib/server/paypal";
import { readOffer, readShop, verifyUser } from "../../../lib/server/staffFirestore";

/** The price is read here from the offer. Nothing about money comes from the browser. */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ reason: "method_not_allowed" });

  const idToken = (req.headers.authorization || "").replace(/^Bearer /, "");
  const { offerId, token } = req.body || {};
  if (!idToken) return res.status(401).json({ reason: "not_signed_in" });
  if (typeof offerId !== "string" || !/^[\w-]{1,64}$/.test(offerId) || !isValidToken(token)) {
    return res.status(400).json({ reason: "bad_request" });
  }

  try {
    const user = await verifyUser(idToken);
    if (!user) return res.status(401).json({ reason: "not_signed_in" });

    const [offer, shop] = await Promise.all([readOffer(offerId), readShop()]);
    const paypalOn = (shop?.methods || []).some((m) => m.type === "paypal");
    if (!offer || !couponShopIsOpen(shop) || !paypalOn || offerStatus(offer).key !== "on_sale") {
      return res.status(409).json({ reason: "not_on_sale" });
    }

    const result = await createPaypalOrder({ offerId, title: offer.title, price: offer.price, uid: user.uid, token });
    if (!result.ok) {
      console.error("PayPal refused an order:", paypalIssue(result));
      return res.status(502).json({ reason: "paypal_refused" });
    }
    return res.status(200).json({ id: result.data.id });
  } catch (err) {
    console.error("PayPal create-order error:", err.message);
    return res.status(502).json({ reason: "paypal_unavailable" });
  }
}
