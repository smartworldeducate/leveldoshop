import { addDoc, collection, doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseClient";
import { computeDiscount, couponProblem, normalizeCode, redemptionKeys } from "../data/coupons";

/** Read a coupon for the basket screen. Null when the code doesn't exist. */
export async function lookupCoupon(code) {
  const id = normalizeCode(code);
  if (!id || id.includes("/")) return null;
  const snap = await getDoc(doc(db, "coupons", id));
  return snap.exists() ? { id, code: id, ...snap.data() } : null;
}

const moneyRound = (value) => Math.round(value * 100) / 100;

/**
 * Save an order. With a coupon, the checks run again in one transaction on
 * fresh data, so the last use of a code can't be taken twice.
 *
 * `lines` are basket lines with their product attached. Rejects with an Error
 * whose `coupon` flag is set when the coupon is what stopped the order.
 */
export async function placeOrder({ user, userId, lines, couponCode }) {
  const cartItems = lines.map((line) => ({
    productId: line.product.id,
    title: line.product.title,
    images: line.product.images || [],
    price: Number(line.price),
    quantity: Number(line.quantity),
  }));
  const subtotal = moneyRound(cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0));

  const base = {
    user,
    userId,
    location: user.location,
    cartItems,
    totalPrice: subtotal,
    createdAt: serverTimestamp(),
  };

  if (!couponCode) {
    const ref = await addDoc(collection(db, "order"), base);
    return { id: ref.id, totalPrice: subtotal, discount: 0 };
  }

  const code = normalizeCode(couponCode);
  const couponRef = doc(db, "coupons", code);
  const keys = redemptionKeys(user);
  const orderRef = doc(collection(db, "order"));

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(couponRef);
    const coupon = snap.exists() ? snap.data() : null;

    const usage = await Promise.all(
      keys.map(async (key) => {
        const ref = doc(db, "coupons", code, "redemptions", key);
        const used = await transaction.get(ref);
        return { ref, count: used.exists() ? used.data().count || 0 : 0 };
      })
    );

    const priced = lines.map((line) => ({
      categorySlug: line.product.categorySlug,
      price: Number(line.price),
      quantity: Number(line.quantity),
    }));
    const problem = couponProblem(coupon, priced, {
      usedByCustomer: Math.max(0, ...usage.map((u) => u.count)),
    });
    if (problem) throw Object.assign(new Error(problem), { coupon: true });

    const { amount, perLine } = computeDiscount(coupon, priced);
    const totalPrice = moneyRound(subtotal - amount);

    transaction.set(orderRef, {
      ...base,
      cartItems: cartItems.map((item, i) => (perLine[i] ? { ...item, discount: perLine[i] } : item)),
      subtotal,
      discount: amount,
      totalPrice,
      coupon: {
        code,
        label: coupon.label || "",
        type: coupon.type,
        value: coupon.value,
        redemptionKeys: keys,
      },
    });
    transaction.update(couponRef, { usedCount: (coupon.usedCount || 0) + 1 });
    usage.forEach(({ ref, count }) => transaction.set(ref, { count: count + 1 }));

    return { id: orderRef.id, totalPrice, discount: amount };
  });
}
