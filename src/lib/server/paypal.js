// PayPal's API. Server only: the secret must never reach a browser.
import { PAYPAL_CURRENCY, paypalCustomId, toPaypalAmount } from "../../data/paypal";

const base = () => process.env.PAYPAL_API_BASE || "https://api-m.paypal.com";

let cached = { token: null, expires: 0 };

async function accessToken() {
  if (cached.token && Date.now() < cached.expires) return cached.token;
  const { NEXT_PUBLIC_PAYPAL_CLIENT_ID: id, PAYPAL_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) throw new Error("not_configured");
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("paypal_login_failed");
  const data = await res.json();
  cached = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return cached.token;
}

/** Returns { ok, status, data }. A refusal from PayPal is an answer, not a crash. */
async function call(path, { method = "GET", body, requestId } = {}) {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      // Pressing twice can't take the money twice.
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export const paypalIssue = (result) => result.data?.details?.[0]?.issue || result.data?.name || "unknown";

export const createPaypalOrder = ({ offerId, title, price, uid, token }) =>
  call("/v2/checkout/orders", {
    method: "POST",
    requestId: `create-${token}`,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: paypalCustomId(uid, offerId),
          invoice_id: token,
          description: String(title).slice(0, 120),
          amount: { currency_code: PAYPAL_CURRENCY, value: toPaypalAmount(price) },
        },
      ],
      application_context: { shipping_preference: "NO_SHIPPING" },
    },
  });

export const getPaypalOrder = (id) => call(`/v2/checkout/orders/${id}`);

export const capturePaypalOrder = (id) =>
  call(`/v2/checkout/orders/${id}/capture`, { method: "POST", requestId: `capture-${id}` });
