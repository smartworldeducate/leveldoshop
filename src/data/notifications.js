// ============================================================
// Customer updates — what we tell a shopper at each delivery step.
//
// The events come from the order itself, so the server and the dashboard agree
// on what can be sent, and a caller can only ever pick an event that actually
// happened, never the wording or the recipient. Pure, so both sides can use it.
// ============================================================

import { ISSUE_TYPES, STEP_INFO, issuesOf, stageHistory } from "./fulfilment";

const shortId = (id) => `#${String(id).slice(0, 6).toUpperCase()}`;

const STEP_SUBJECTS = {
  confirmed: "is confirmed",
  packed: "is packed",
  on_the_way: "is on its way",
  delivered: "has been delivered",
};

const unitList = (items = []) => items.map((i) => `${i.quantity} × ${i.title}`).join(", ");

/** Everything worth telling the customer, oldest first. */
export function eventsOf(order) {
  const events = stageHistory(order).map((h) => ({ key: `stage:${h.stage}`, kind: "stage", stage: h.stage, at: h.at }));

  issuesOf(order).forEach((issue) => {
    events.push({ key: `issue:${issue.id}`, kind: "problem", issue, at: issue.reportedAt });
    if (issue.status === "resolved") {
      events.push({ key: `issue:${issue.id}:${issue.resolution}`, kind: issue.resolution, issue, at: issue.resolvedAt });
    }
  });

  return events.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export const latestEvent = (order) => eventsOf(order).at(-1) || null;

export const findEvent = (order, key) => eventsOf(order).find((e) => e.key === key) || null;

/** The words for one event: a subject, a short staff-facing label and the message. */
export function eventMessage(order, event) {
  const id = shortId(order.id);
  const ref = `Your order ${id}`;
  switch (event.kind) {
    case "stage":
      return {
        label: STEP_INFO[event.stage]?.label,
        subject: `${ref} ${STEP_SUBJECTS[event.stage]}`,
        body: STEP_INFO[event.stage]?.customer,
      };
    case "problem":
      return {
        label: `Problem: ${ISSUE_TYPES[event.issue.type]?.label}`,
        subject: `An update on your order ${id}`,
        body: ISSUE_TYPES[event.issue.type]?.customer,
      };
    case "retry":
      return {
        label: "Problem fixed",
        subject: `${ref} is back on track`,
        body: "The problem with your order has been sorted, and it's moving again.",
      };
    case "short":
      return {
        label: "Delivering without items",
        subject: `A change to your order ${id}`,
        body: `We can't deliver ${unitList(event.issue.items)}. The rest of your order is on track, and you won't pay for these items.`,
      };
    case "cancel":
      return {
        label: "Order cancelled",
        subject: `${ref} has been cancelled`,
        body: "We're sorry, but your order has been cancelled, so you won't be charged. Please contact us if you have any questions.",
      };
    default:
      return { label: "Update", subject: `An update on your order ${id}`, body: "" };
  }
}

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Subject, plain text and HTML for the email. Customer and product names are escaped. */
export function renderEmail(order, event, { storeName, ordersUrl }) {
  const { subject, body } = eventMessage(order, event);
  const name = order.user?.name?.trim() || "there";

  const text = [
    `Hello ${name},`,
    "",
    body,
    "",
    `Order ${shortId(order.id)}`,
    `Track your order: ${ordersUrl}`,
    "",
    storeName,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#eef2f9;font-family:Arial,Helvetica,sans-serif;color:#1e2033">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="padding:22px 28px;background:#4267b2;color:#ffffff;font-size:18px;font-weight:bold">${escapeHtml(storeName)}</td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 12px;font-size:15px">Hello ${escapeHtml(name)},</p>
<p style="margin:0 0 20px;font-size:17px;font-weight:bold;line-height:1.4">${escapeHtml(body)}</p>
<p style="margin:0 0 24px;font-size:14px;color:#6b6f85">Order ${escapeHtml(shortId(order.id))}</p>
<a href="${escapeHtml(ordersUrl)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#4267b2;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none">Track your order</a>
</td></tr>
</table>
</body></html>`;

  return { subject, text, html };
}

/** Local numbers start with 0 here; wa.me wants the country code. Null if unusable. */
export function whatsappNumber(phone) {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (raw.startsWith("+") || digits.startsWith("92")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits.startsWith("0") ? `92${digits.slice(1)}` : `92${digits}`;
}

/** A wa.me link with the update already typed in, for staff to send. */
export function whatsappLink(order, event, ordersUrl) {
  const number = whatsappNumber(order.user?.phone);
  if (!number) return null;
  const name = order.user?.name?.trim() || "there";
  const message = `Hello ${name}, ${eventMessage(order, event).body}\n\nOrder ${shortId(order.id)}\nTrack it here: ${ordersUrl}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
