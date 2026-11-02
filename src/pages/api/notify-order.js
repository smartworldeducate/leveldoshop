import nodemailer from "nodemailer";

import { isAdmin } from "../../lib/admins";
import { isDashboardUser, readOrder, verifyUser } from "../../lib/server/staffFirestore";
import { findEvent, renderEmail } from "../../data/notifications";

/**
 * Emails a customer about something that happened to their order.
 *
 * Staff only. The caller names an order and one of its events; the recipient
 * and the wording come from the saved order, so this can't be used to send
 * arbitrary mail. An update already sent isn't repeated unless `resend` is set.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ reason: "method_not_allowed" });

  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  const { orderId, eventKey, resend } = req.body || {};
  if (!token) return res.status(401).json({ reason: "not_signed_in" });
  if (!orderId || !eventKey) return res.status(400).json({ reason: "bad_request" });

  try {
    const user = await verifyUser(token);
    if (!user) return res.status(401).json({ reason: "not_signed_in" });
    if (!isAdmin(user) && !(await isDashboardUser(user.email, token))) {
      return res.status(403).json({ reason: "not_staff" });
    }

    const order = await readOrder(orderId, token);
    if (!order) return res.status(404).json({ reason: "order_not_found" });

    const event = findEvent(order, eventKey);
    if (!event) return res.status(400).json({ reason: "unknown_event" });

    if (order.notifications?.[eventKey]?.email?.status === "sent" && !resend) {
      return res.status(200).json({ skipped: true });
    }

    const to = order.user?.email?.trim();
    if (!/^\S+@\S+\.\S+$/.test(to || "")) return res.status(422).json({ reason: "no_email" });

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, NEXT_PUBLIC_SITE_URL } = process.env;
    if (!SMTP_HOST) return res.status(503).json({ reason: "not_configured" });

    const port = Number(SMTP_PORT) || 587;
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
    });

    const storeName = process.env.STORE_NAME || "A-one Grocery";
    const site = NEXT_PUBLIC_SITE_URL || `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;
    const email = renderEmail(order, event, { storeName, ordersUrl: `${site.replace(/\/$/, "")}/orders` });

    await transporter.sendMail({
      from: `"${storeName}" <${SMTP_FROM || SMTP_USER}>`,
      to,
      ...email,
    });

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error("notify-order failed:", err);
    return res.status(502).json({ reason: "send_failed" });
  }
}
