import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseClient";
import { orderDate } from "./analytics";
import { ownsOrder } from "../data/returns";

/**
 * A shopper's orders: those placed from their account, plus those whose
 * checkout email is theirs (checkout doesn't require signing in).
 * Sorted here rather than with orderBy, which would need a composite index.
 */
export async function fetchCustomerOrders(user) {
  const orders = collection(db, "order");
  const snaps = await Promise.all([
    getDocs(query(orders, where("userId", "==", user.uid))),
    // Security rules only allow this for verified emails, so an unverified account
    // still gets the orders on its own account rather than an error.
    ...(user.email
      ? [getDocs(query(orders, where("user.email", "==", user.email))).catch(() => ({ docs: [] }))]
      : []),
  ]);

  const byId = new Map();
  snaps.forEach((snap) => snap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() })));

  return [...byId.values()].sort((a, b) => (orderDate(b) || 0) - (orderDate(a) || 0));
}

/** One order, only if it belongs to this shopper; null otherwise. */
export async function fetchCustomerOrder(id, user) {
  const snap = await getDoc(doc(db, "order", id));
  if (!snap.exists()) return null;
  const order = { id: snap.id, ...snap.data() };
  return ownsOrder(order, user) ? order : null;
}
