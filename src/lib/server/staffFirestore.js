// Server-side reads made as the signed-in person, using their Firebase ID token
// over REST, so Firestore security rules apply as they do in the browser.
import { firebaseConfig } from "../firebaseClient";

const DOCS = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

/** Firestore's typed REST JSON → plain values. */
function decode(value) {
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decode);
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("nullValue" in value) return null;
  return Object.values(value)[0];
}

const decodeFields = (fields) =>
  Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decode(value)]));

async function getDocument(path, token) {
  const res = await fetch(`${DOCS}/${path}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore read failed (${res.status})`);
  return decodeFields((await res.json()).fields || {});
}

/** Who an ID token really belongs to, according to Firebase; null if it's invalid. */
export async function verifyUser(token) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: token }) }
  );
  if (!res.ok) return null;
  const user = (await res.json()).users?.[0];
  return user?.email ? { email: user.email, uid: user.localId } : null;
}

export const isDashboardUser = async (email, token) =>
  Boolean(await getDocument(`dashboardUsers/${encodeURIComponent(email.toLowerCase())}`, token));

export async function readOrder(id, token) {
  const data = await getDocument(`order/${encodeURIComponent(id)}`, token);
  return data && { id, ...data };
}

/** Offers and shop settings are public, so these need no token. */
export async function readOffer(id) {
  const data = await getDocument(`couponOffers/${encodeURIComponent(id)}`);
  return data && { id, ...data };
}

export const readShop = async () => (await getDocument("settings/storefront"))?.couponShop || null;

export async function readPurchase(id, token) {
  const data = await getDocument(`couponPurchases/${encodeURIComponent(id)}`, token);
  return data && { id, ...data };
}
