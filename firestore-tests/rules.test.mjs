// Checks firestore.rules against every way the website reads and writes data.
// Runs on the local emulator only. Never touches a real project.
//   cd firestore-tests && npm install && npm test
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, orderBy, query, runTransaction,
  serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from "firebase/firestore";

const here = path.dirname(fileURLToPath(import.meta.url));
const env = await initializeTestEnvironment({
  projectId: "demo-aone",
  firestore: { rules: fs.readFileSync(path.join(here, "../firestore.rules"), "utf8"), host: "127.0.0.1", port: 8181 },
});

const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const line = { productId: "p1", title: "Milk", images: [], price: 10, quantity: 2 };
const buyer = { name: "Sana", email: "sana@example.com", phone: "03001112222", city: "Lahore", address: "1 St", location: { lat: 1, lng: 2 } };
const coupon = (extra = {}) => ({ label: "", type: "percent", value: 10, maxDiscount: 0, minOrder: 0, startsAt: "", endsAt: "", usageLimit: 0, perCustomerLimit: 1, usedCount: 0, categorySlugs: [], enabled: true, showOnSite: false, ...extra });
const newOrder = (extra = {}) => ({ user: buyer, userId: null, location: buyer.location, cartItems: [line], totalPrice: 20, createdAt: serverTimestamp(), ...extra });
const couponOrder = (code, extra = {}) => newOrder({ subtotal: 20, discount: 2, totalPrice: 18, coupon: { code, label: "", type: "percent", value: 10, redemptionKeys: ["email:sana@example.com"] }, ...extra });
const purchase = (extra = {}) => ({ offerId: "o1", offerTitle: "$20 voucher", price: 15, buyer: { uid: "sana", email: "sana@example.com", name: "Sana", phone: "03001112222" }, reference: "TX9", token: "TKN-ABC234", paymentMethod: "JazzCash", hasReceipt: true, status: "pending", createdAt: serverTimestamp(), ...extra });
const receipt = (extra = {}) => ({ uid: "sana", image: "data:image/jpeg;base64,AAAA", createdAt: serverTimestamp(), ...extra });
// A purchase and its receipt are saved together, as the website does.
const buy = (db, id = "new1", extra = {}, receiptExtra = {}) => {
  const batch = writeBatch(db);
  batch.set(doc(db, `couponPurchases/${id}`), purchase(extra));
  batch.set(doc(db, `couponReceipts/${id}`), receipt(receiptExtra));
  return batch.commit();
};
const entry = (extra = {}) => ({ drawId: "open", uid: "sana", name: "Sana", phone: "03001112222", createdAt: serverTimestamp(), ...extra });
const request = (extra = {}) => ({ id: "r1", status: "requested", source: "customer", reason: "other", items: [], history: [], ...extra });

const seed = async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "products/p1"), { title: "Milk", stock: 5, price: 10 });
    await setDoc(doc(db, "categories/c1"), { name: "Dairy", slug: "dairy", visible: true });
    await setDoc(doc(db, "posts/post1"), { title: "Hello", likes: 3 });
    await setDoc(doc(db, "settings/storefront"), { storeName: "A-one" });
    await setDoc(doc(db, "dashboardUsers/staff@example.com"), { email: "staff@example.com" });
    const base = { user: buyer, location: buyer.location, cartItems: [line], totalPrice: 20, createdAt: new Date() };
    await setDoc(doc(db, "order/mine"), { ...base, userId: "sana", status: "completed" });
    await setDoc(doc(db, "order/pendingMine"), { ...base, userId: "sana" });
    await setDoc(doc(db, "order/guestByEmail"), { ...base, userId: null, status: "completed" });
    await setDoc(doc(db, "order/legacyByEmail"), { ...base, status: "completed" });
    await setDoc(doc(db, "order/withReturn"), { ...base, userId: "sana", status: "completed", returns: [request({ id: "old" })] });
    await setDoc(doc(db, "order/theirs"), { ...base, userId: "bilal", user: { ...buyer, email: "bilal@example.com" }, status: "completed" });
    await setDoc(doc(db, "coupons/LIVE"), coupon({ showOnSite: true }));
    await setDoc(doc(db, "coupons/PRIVATE"), coupon());
    await setDoc(doc(db, "coupons/DATED"), coupon({ startsAt: ago(1), endsAt: ago(-1) }));
    await setDoc(doc(db, "coupons/OFF"), coupon({ enabled: false }));
    await setDoc(doc(db, "coupons/EXPIRED"), coupon({ endsAt: ago(1) }));
    await setDoc(doc(db, "coupons/FUTURE"), coupon({ startsAt: ago(-1) }));
    await setDoc(doc(db, "coupons/USEDUP"), coupon({ usageLimit: 1, usedCount: 1 }));
    await setDoc(doc(db, "coupons/LIVE/redemptions/email:used@example.com"), { count: 1 });
    await setDoc(doc(db, "couponOffers/o1"), { title: "$20 voucher", price: 15, type: "fixed", value: 20, enabled: true, soldCount: 0, stock: 0 });
    await setDoc(doc(db, "couponOffers/off"), { title: "Paused", price: 5, type: "fixed", value: 5, enabled: false });
    await setDoc(doc(db, "rewardDraws/open"), { title: "Open", prize: "Basket", visible: true, closesAt: ago(-5), resultsAt: ago(-10) });
    await setDoc(doc(db, "rewardDraws/ended"), { title: "Ended", prize: "Basket", visible: true, closesAt: ago(5), resultsAt: ago(1) });
    await setDoc(doc(db, "rewardDraws/hidden"), { title: "Hidden", prize: "Basket", visible: false, closesAt: ago(-5), resultsAt: ago(-10) });
    await setDoc(doc(db, "rewardEntries/open_bilal"), { drawId: "open", uid: "bilal", name: "Bilal", phone: "0300", createdAt: new Date() });
    await setDoc(doc(db, "couponPurchases/pMine"), { offerId: "o1", offerTitle: "$20 voucher", price: 15, buyer: { uid: "sana", email: "sana@example.com" }, reference: "TX1", status: "pending", createdAt: new Date() });
    await setDoc(doc(db, "couponPurchases/pTheirs"), { offerId: "o1", offerTitle: "$20 voucher", price: 15, buyer: { uid: "bilal", email: "bilal@example.com" }, reference: "TX2", status: "pending", createdAt: new Date() });
  });
};

const visitor = () => env.unauthenticatedContext().firestore();
const sana = () => env.authenticatedContext("sana", { email: "sana@example.com", email_verified: true }).firestore();
// A password account someone registered using Sana's address, without proving it's theirs.
const impostor = () => env.authenticatedContext("fake", { email: "sana@example.com", email_verified: false }).firestore();
const staff = () => env.authenticatedContext("staff", { email: "Staff@Example.com", email_verified: false }).firestore();
const owner = () => env.authenticatedContext("owner", { email: "salmanalisoftwareenginear@gmail.com", email_verified: false }).firestore();

// Writes an order and counts the coupon in one go, as src/lib/placeOrder.js does.
const placeWithCoupon = (db, code, { order, count = 1 } = {}) =>
  runTransaction(db, async (tx) => {
    const ref = doc(db, "coupons", code);
    const snap = await tx.get(ref);
    tx.set(doc(collection(db, "order")), order || couponOrder(code));
    if (count) tx.update(ref, { usedCount: (snap.data()?.usedCount || 0) + count });
    tx.set(doc(db, `coupons/${code}/redemptions/email:sana@example.com`), { count: 1 });
  });

const tests = {
  "Visitors": {
    "read the shop": async () => {
      const db = visitor();
      for (const name of ["products", "categories", "posts"]) await assertSucceeds(getDocs(collection(db, name)));
      await assertSucceeds(getDoc(doc(db, "settings/storefront")));
    },
    "can't change the shop": async () => {
      const db = visitor();
      await assertFails(updateDoc(doc(db, "products/p1"), { stock: 999 }));
      await assertFails(updateDoc(doc(db, "products/p1"), { price: 0 }));
      await assertFails(setDoc(doc(db, "products/new"), { title: "x" }));
      await assertFails(deleteDoc(doc(db, "products/p1")));
      await assertFails(setDoc(doc(db, "settings/storefront"), { storeName: "hacked" }));
      await assertFails(setDoc(doc(db, "categories/c2"), { name: "x" }));
      await assertFails(setDoc(doc(db, "posts/new"), { title: "x" }));
    },
    "can't read orders": async () => {
      const db = visitor();
      await assertFails(getDocs(collection(db, "order")));
      await assertFails(getDoc(doc(db, "order/mine")));
      await assertFails(getDocs(query(collection(db, "order"), where("user.email", "==", "sana@example.com"))));
    },
    "can't see staff or messages": async () => {
      const db = visitor();
      await assertFails(getDocs(collection(db, "dashboardUsers")));
      await assertFails(getDoc(doc(db, "dashboardUsers/staff@example.com")));
      await assertFails(getDocs(collection(db, "contactMessages")));
    },
    "can't make themselves staff": async () => {
      await assertFails(setDoc(doc(visitor(), "dashboardUsers/me@example.com"), { email: "me@example.com" }));
    },
    "can order as a guest": async () => {
      await assertSucceeds(addDoc(collection(visitor(), "order"), newOrder()));
    },
    "can't forge a processed or empty order": async () => {
      const orders = collection(visitor(), "order");
      for (const bad of [{ status: "completed" }, { fulfilment: {} }, { issues: [] }, { returns: [] }, { notifications: {} }, { anything: 1 }, { cartItems: [] }, { totalPrice: -5 }, { totalPrice: "free" }, { createdAt: new Date(0) }, { userId: "sana" }]) {
        await assertFails(addDoc(orders, newOrder(bad)));
      }
    },
    "can send a contact message": async () => {
      await assertSucceeds(addDoc(collection(visitor(), "contactMessages"), { name: "A", email: "a@b.c", message: "hi", createdAt: serverTimestamp() }));
      await assertFails(addDoc(collection(visitor(), "contactMessages"), { name: "A", email: "a@b.c", message: "x".repeat(5001), createdAt: serverTimestamp() }));
      await assertFails(addDoc(collection(visitor(), "contactMessages"), { name: "A", extra: 1, createdAt: serverTimestamp() }));
    },
    "can add exactly one like": async () => {
      const post = doc(visitor(), "posts/post1");
      await assertSucceeds(updateDoc(post, { likes: increment(1) }));
      await assertFails(updateDoc(post, { likes: increment(5) }));
      await assertFails(updateDoc(post, { title: "hacked" }));
      await assertFails(updateDoc(post, { likes: increment(1), title: "hacked" }));
    },
  },
  "Coupons, as a customer": {
    "can't list every coupon": async () => {
      await assertFails(getDocs(collection(visitor(), "coupons")));
      await assertFails(getDocs(query(collection(visitor(), "coupons"), where("showOnSite", "==", false))));
    },
    "can list those on the website": async () => {
      const snap = await assertSucceeds(getDocs(query(collection(visitor(), "coupons"), where("showOnSite", "==", true))));
      if (snap.size !== 1 || snap.docs[0].id !== "LIVE") throw new Error("wrong coupons listed");
    },
    "can look up a code they know": async () => {
      await assertSucceeds(getDoc(doc(visitor(), "coupons/PRIVATE")));
    },
    "can't create, edit or delete": async () => {
      const db = visitor();
      await assertFails(setDoc(doc(db, "coupons/MINE"), coupon({ value: 100 })));
      await assertFails(updateDoc(doc(db, "coupons/LIVE"), { value: 100 }));
      await assertFails(updateDoc(doc(db, "coupons/EXPIRED"), { enabled: true }));
      await assertFails(updateDoc(doc(db, "coupons/USEDUP"), { usedCount: 0 }));
      await assertFails(deleteDoc(doc(db, "coupons/LIVE")));
    },
    "guest order with a live coupon works": async () => {
      await assertSucceeds(placeWithCoupon(visitor(), "LIVE"));
      await assertSucceeds(placeWithCoupon(visitor(), "DATED"));
    },
    "signed-in order with a coupon works": async () => {
      await assertSucceeds(placeWithCoupon(sana(), "LIVE", { order: couponOrder("LIVE", { userId: "sana" }) }));
    },
    "dead coupons are refused": async () => {
      for (const code of ["OFF", "EXPIRED", "FUTURE", "USEDUP"]) {
        await assertFails(placeWithCoupon(visitor(), code));
      }
      await assertFails(addDoc(collection(visitor(), "order"), couponOrder("NOSUCHCODE")));
    },
    "the use must be counted, by one": async () => {
      await assertFails(placeWithCoupon(visitor(), "LIVE", { count: 0 }));
      await assertFails(placeWithCoupon(visitor(), "LIVE", { count: 2 }));
      await assertFails(addDoc(collection(visitor(), "order"), couponOrder("LIVE")));
    },
    "a discount can't exceed the items": async () => {
      await assertFails(placeWithCoupon(visitor(), "LIVE", { order: couponOrder("LIVE", { discount: 50 }) }));
      await assertFails(placeWithCoupon(visitor(), "LIVE", { order: couponOrder("LIVE", { totalPrice: 500 }) }));
    },
    "counts per customer": async () => {
      const db = visitor();
      const usage = (key) => doc(db, `coupons/LIVE/redemptions/${key}`);
      await assertSucceeds(getDoc(usage("email:new@example.com")));
      await assertSucceeds(setDoc(usage("email:new@example.com"), { count: 1 }));
      await assertSucceeds(setDoc(usage("email:used@example.com"), { count: 2 }));
      await assertFails(setDoc(usage("email:used@example.com"), { count: 0 }));
      await assertFails(setDoc(usage("email:other@example.com"), { count: 5 }));
      await assertFails(deleteDoc(usage("email:used@example.com")));
      await assertFails(getDocs(collection(db, "coupons/LIVE/redemptions")));
    },
  },
  "Buying coupons": {
    "anyone can see what's on sale": async () => {
      await assertSucceeds(getDocs(collection(visitor(), "couponOffers")));
    },
    "only staff can change offers": async () => {
      await assertFails(updateDoc(doc(sana(), "couponOffers/o1"), { price: 0 }));
      await assertFails(setDoc(doc(sana(), "couponOffers/new"), { title: "x", price: 0 }));
      await assertSucceeds(updateDoc(doc(staff(), "couponOffers/o1"), { price: 12 }));
    },
    "a customer can request one at the real price, with a private receipt": async () => {
      await assertSucceeds(buy(sana()));
    },
    "guests can't, and nobody can cheat the request": async () => {
      await assertFails(buy(visitor()));
      for (const bad of [{ price: 1 }, { status: "confirmed" }, { couponCode: "FREE" }, { offerTitle: "Other" }, { offerId: "off" }, { offerId: "nope" }, { buyer: { uid: "bilal" } }, { screenshot: "https://res.cloudinary.com/x/shot.png" }, { hasReceipt: false }]) {
        await assertFails(buy(sana(), "bad", bad));
      }
    },
    "a token has to be a real one, not whatever is typed in the address": async () => {
      for (const token of ["hello", "<script>", "TKN-abc234", "TKN-ABC2345", "TKN-ABC10O", ""]) {
        await assertFails(buy(sana(), "bad", { token }));
      }
    },
    "a purchase can't be saved without its receipt": async () => {
      await assertFails(setDoc(doc(sana(), "couponPurchases/alone"), purchase()));
    },
    "a receipt must be a small image of the buyer's own purchase": async () => {
      await assertFails(buy(sana(), "bad", {}, { uid: "bilal" }));
      await assertFails(buy(sana(), "bad", {}, { image: "https://res.cloudinary.com/x/shot.png" }));
      await assertFails(buy(sana(), "bad", {}, { image: "data:text/html;base64,AAAA" }));
      await assertFails(buy(sana(), "bad", {}, { image: `data:image/jpeg;base64,${"A".repeat(900000)}` }));
      await assertSucceeds(buy(sana(), "big", {}, { image: `data:image/jpeg;base64,${"A".repeat(800000)}` }));
      await assertFails(setDoc(doc(sana(), "couponReceipts/pTheirs"), receipt()));
    },
    "only the buyer and staff can open a receipt, and nobody can change it": async () => {
      await assertSucceeds(buy(sana(), "mine1"));
      await assertSucceeds(getDoc(doc(sana(), "couponReceipts/mine1")));
      await assertSucceeds(getDoc(doc(staff(), "couponReceipts/mine1")));
      await assertSucceeds(getDocs(collection(staff(), "couponReceipts")));
      await assertFails(getDoc(doc(visitor(), "couponReceipts/mine1")));
      await assertFails(getDoc(doc(env.authenticatedContext("bilal", { email: "bilal@example.com" }).firestore(), "couponReceipts/mine1")));
      await assertFails(getDocs(collection(visitor(), "couponReceipts")));
      await assertFails(getDocs(collection(sana(), "couponReceipts")));
      await assertFails(updateDoc(doc(sana(), "couponReceipts/mine1"), { image: "data:image/jpeg;base64,BBBB" }));
      await assertFails(deleteDoc(doc(sana(), "couponReceipts/mine1")));
      await assertSucceeds(deleteDoc(doc(staff(), "couponReceipts/mine1")));
    },
    "customers see only their own, and can't change them": async () => {
      const db = sana();
      const snap = await assertSucceeds(getDocs(query(collection(db, "couponPurchases"), where("buyer.uid", "==", "sana"))));
      if (snap.size !== 1) throw new Error("wrong purchases");
      await assertFails(getDocs(collection(db, "couponPurchases")));
      await assertFails(getDoc(doc(db, "couponPurchases/pTheirs")));
      await assertFails(updateDoc(doc(db, "couponPurchases/pMine"), { status: "confirmed", couponCode: "X" }));
      await assertFails(deleteDoc(doc(db, "couponPurchases/pMine")));
    },
    "staff confirm, creating the code": async () => {
      const db = staff();
      await assertSucceeds(getDocs(collection(db, "couponPurchases")));
      await assertSucceeds(runTransaction(db, async (tx) => {
        const purchaseRef = doc(db, "couponPurchases/pMine");
        const offerRef = doc(db, "couponOffers/o1");
        const couponRef = doc(db, "coupons/BUYABC");
        await tx.get(purchaseRef);
        await tx.get(offerRef);
        await tx.get(couponRef);
        tx.set(couponRef, coupon({ usageLimit: 1 }));
        tx.update(offerRef, { soldCount: 1 });
        tx.update(purchaseRef, { status: "confirmed", couponCode: "BUYABC" });
      }));
    },
    "customers can't create the code themselves": async () => {
      await assertFails(setDoc(doc(sana(), "coupons/BUYMINE"), coupon()));
    },
  },
  "Reward draw": {
    "anyone can read draws, only staff change them": async () => {
      await assertSucceeds(getDocs(collection(visitor(), "rewardDraws")));
      await assertFails(updateDoc(doc(sana(), "rewardDraws/open"), { winner: { name: "Sana" } }));
      await assertFails(setDoc(doc(sana(), "rewardDraws/mine"), { title: "x" }));
      await assertSucceeds(updateDoc(doc(staff(), "rewardDraws/ended"), { winner: { name: "Sana M." }, history: [] }));
    },
    "a signed-in customer enters free, once": async () => {
      const db = sana();
      const mine = doc(db, "rewardEntries/open_sana");
      await assertSucceeds(setDoc(mine, entry()));
      await assertFails(setDoc(mine, entry({ name: "Again" })));
      await assertSucceeds(getDoc(mine));
    },
    "no entering for others, while closed, or as a guest": async () => {
      await assertFails(setDoc(doc(visitor(), "rewardEntries/open_sana"), entry()));
      await assertFails(setDoc(doc(sana(), "rewardEntries/open_bilal"), entry({ uid: "bilal" })));
      await assertFails(setDoc(doc(sana(), "rewardEntries/open_extra"), entry()));
      await assertFails(setDoc(doc(sana(), "rewardEntries/ended_sana"), entry({ drawId: "ended" })));
      await assertFails(setDoc(doc(sana(), "rewardEntries/hidden_sana"), entry({ drawId: "hidden" })));
      await assertFails(setDoc(doc(sana(), "rewardEntries/open_sana"), entry({ extraEntries: 5 })));
    },
    "other people's entries stay private": async () => {
      await assertFails(getDoc(doc(sana(), "rewardEntries/open_bilal")));
      await assertFails(getDocs(collection(sana(), "rewardEntries")));
      await assertFails(getDocs(query(collection(visitor(), "rewardEntries"), where("drawId", "==", "open"))));
      await assertFails(deleteDoc(doc(sana(), "rewardEntries/open_bilal")));
    },
    "staff can see entries to pick a winner": async () => {
      const snap = await assertSucceeds(getDocs(query(collection(staff(), "rewardEntries"), where("drawId", "==", "open"))));
      if (snap.size !== 1) throw new Error("wrong entries");
    },
  },
  "Signed-in customers": {
    "see their orders in My orders": async () => {
      const db = sana();
      const orders = collection(db, "order");
      const byAccount = await assertSucceeds(getDocs(query(orders, where("userId", "==", "sana"))));
      const byEmail = await assertSucceeds(getDocs(query(orders, where("user.email", "==", "sana@example.com"))));
      if (byAccount.size !== 3) throw new Error(`expected 3 by account, got ${byAccount.size}`);
      if (byEmail.size !== 5) throw new Error(`expected 5 by email, got ${byEmail.size}`);
      await assertSucceeds(getDoc(doc(db, "order/mine")));
      await assertSucceeds(getDoc(doc(db, "order/guestByEmail")));
      await assertSucceeds(getDoc(doc(db, "order/legacyByEmail")));
    },
    "can't see other people's orders": async () => {
      const db = sana();
      await assertFails(getDoc(doc(db, "order/theirs")));
      await assertFails(getDocs(collection(db, "order")));
      await assertFails(getDocs(query(collection(db, "order"), orderBy("createdAt", "desc"))));
      await assertFails(getDocs(query(collection(db, "order"), where("user.email", "==", "bilal@example.com"))));
      await assertFails(getDocs(query(collection(db, "order"), where("userId", "==", "bilal"))));
    },
    "an unverified account using their email sees nothing": async () => {
      const db = impostor();
      await assertFails(getDoc(doc(db, "order/mine")));
      await assertFails(getDocs(query(collection(db, "order"), where("user.email", "==", "sana@example.com"))));
    },
    "can request a return": async () => {
      await assertSucceeds(updateDoc(doc(sana(), "order/mine"), { returns: [request()] }));
      await assertSucceeds(updateDoc(doc(sana(), "order/guestByEmail"), { returns: [request()] }));
      await assertSucceeds(updateDoc(doc(sana(), "order/withReturn"), { returns: [request({ id: "old" }), request()] }));
    },
    "can't cheat on returns": async () => {
      const mine = doc(sana(), "order/mine");
      await assertFails(updateDoc(mine, { returns: [request({ status: "refunded", refund: { amount: 999 } })] }));
      await assertFails(updateDoc(mine, { returns: [request({ status: "approved" })] }));
      await assertFails(updateDoc(mine, { returns: [request({ source: "staff" })] }));
      await assertFails(updateDoc(mine, { returns: [request(), request({ id: "r2" })] }));
      await assertFails(updateDoc(mine, { returns: [request()], totalPrice: 0 }));
      const older = doc(sana(), "order/withReturn");
      await assertFails(updateDoc(older, { returns: [] }));
      await assertFails(updateDoc(older, { returns: [request({ id: "old", status: "refunded" }), request()] }));
      await assertFails(updateDoc(doc(sana(), "order/pendingMine"), { returns: [request()] }));
      await assertFails(updateDoc(doc(sana(), "order/theirs"), { returns: [request()] }));
    },
    "can't change their order or the stock": async () => {
      const db = sana();
      await assertFails(updateDoc(doc(db, "order/mine"), { totalPrice: 0 }));
      await assertFails(updateDoc(doc(db, "order/pendingMine"), { status: "completed" }));
      await assertFails(deleteDoc(doc(db, "order/mine")));
      await assertFails(updateDoc(doc(db, "products/p1"), { stock: 999 }));
    },
    "can't order as someone else": async () => {
      await assertFails(addDoc(collection(sana(), "order"), newOrder({ userId: "bilal" })));
      await assertSucceeds(addDoc(collection(sana(), "order"), newOrder({ userId: "sana" })));
    },
    "the access check works, and reveals nobody else": async () => {
      await assertSucceeds(getDoc(doc(sana(), "dashboardUsers/sana@example.com")));
      await assertFails(getDoc(doc(sana(), "dashboardUsers/staff@example.com")));
      await assertFails(getDocs(collection(sana(), "dashboardUsers")));
    },
    "aren't staff": async () => {
      const db = sana();
      await assertFails(setDoc(doc(db, "dashboardUsers/sana@example.com"), { email: "sana@example.com" }));
      await assertFails(getDocs(query(collection(db, "order"), orderBy("createdAt", "desc"))));
      await assertFails(getDocs(collection(db, "contactMessages")));
      await assertFails(setDoc(doc(db, "coupons/MINE"), coupon()));
    },
  },
  "Dashboard users": {
    "run the dashboard": async () => {
      const db = staff();
      await assertSucceeds(getDocs(query(collection(db, "order"), orderBy("createdAt", "desc"))));
      await assertSucceeds(getDoc(doc(db, "dashboardUsers/staff@example.com")));
      await assertSucceeds(getDocs(collection(db, "dashboardUsers")));
      await assertSucceeds(getDocs(collection(db, "contactMessages")));
      await assertSucceeds(addDoc(collection(db, "products"), { title: "New" }));
      await assertSucceeds(updateDoc(doc(db, "products/p1"), { stock: 9 }));
      await assertSucceeds(deleteDoc(doc(db, "products/p1")));
      await assertSucceeds(setDoc(doc(db, "settings/storefront"), { storeName: "New" }, { merge: true }));
      await assertSucceeds(setDoc(doc(db, "posts/post1"), { title: "Edit" }, { merge: true }));
      const batch = writeBatch(db);
      batch.update(doc(db, "categories/c1"), { order: 3 });
      await assertSucceeds(batch.commit());
    },
    "move orders, deduct stock and give coupons back": async () => {
      const db = staff();
      await assertSucceeds(runTransaction(db, async (tx) => {
        const order = doc(db, "order/pendingMine");
        const product = doc(db, "products/p1");
        await tx.get(order);
        const stock = (await tx.get(product)).data().stock;
        tx.update(product, { stock: stock - 2 });
        tx.update(order, { status: "completed", completedAt: "x", fulfilment: { stage: "delivered", history: [] }, notifications: {} });
      }));
      await assertSucceeds(runTransaction(db, async (tx) => {
        const c = doc(db, "coupons/LIVE");
        const used = doc(db, "coupons/LIVE/redemptions/email:used@example.com");
        await tx.get(c);
        await tx.get(used);
        tx.update(c, { usedCount: 0 });
        tx.delete(used);
        tx.delete(doc(db, "order/theirs"));
      }));
    },
    "manage coupons": async () => {
      const db = staff();
      const all = await assertSucceeds(getDocs(collection(db, "coupons")));
      if (all.size < 6) throw new Error("staff should see every coupon");
      await assertSucceeds(setDoc(doc(db, "coupons/NEW"), coupon()));
      await assertSucceeds(updateDoc(doc(db, "coupons/LIVE"), { value: 50, enabled: false }));
      await assertSucceeds(getDocs(collection(db, "coupons/LIVE/redemptions")));
      await assertSucceeds(deleteDoc(doc(db, "coupons/LIVE/redemptions/email:used@example.com")));
      await assertSucceeds(deleteDoc(doc(db, "coupons/LIVE")));
    },
    "can't manage dashboard users": async () => {
      const db = staff();
      await assertFails(setDoc(doc(db, "dashboardUsers/friend@example.com"), { email: "friend@example.com" }));
      await assertFails(deleteDoc(doc(db, "dashboardUsers/staff@example.com")));
    },
  },
  "Owner": {
    "manages dashboard users and sees orders": async () => {
      const db = owner();
      await assertSucceeds(getDocs(collection(db, "dashboardUsers")));
      await assertSucceeds(setDoc(doc(db, "dashboardUsers/new@example.com"), { email: "new@example.com" }));
      await assertSucceeds(deleteDoc(doc(db, "dashboardUsers/new@example.com")));
      await assertSucceeds(getDocs(query(collection(db, "order"), orderBy("createdAt", "desc"))));
    },
  },
  "Everything else": {
    "is denied": async () => {
      await assertFails(getDoc(doc(owner(), "secrets/x")));
      await assertFails(setDoc(doc(visitor(), "anything/x"), { a: 1 }));
    },
  },
};

let passed = 0;
const failures = [];
for (const [group, cases] of Object.entries(tests)) {
  console.log(`\n${group}`);
  for (const [name, run] of Object.entries(cases)) {
    await seed();
    try {
      await run();
      passed += 1;
      console.log(`  PASS  ${name}`);
    } catch (err) {
      failures.push(name);
      console.log(`  FAIL  ${name}\n        ${String(err.message).split("\n")[0].slice(0, 220)}`);
    }
  }
}
await env.cleanup();
console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
