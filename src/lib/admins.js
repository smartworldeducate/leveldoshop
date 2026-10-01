import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { db, getStaffAuth } from "./firebaseClient";

// Who owns /dashboard. Set NEXT_PUBLIC_ADMIN_EMAILS to a comma-separated
// list to change this without a code edit; the literal below is the fallback.
// Owners can always get in and are the only ones who can manage dashboard users.
const FALLBACK = ["salmanalisoftwareenginear@gmail.com"];

export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const allowlist = ADMIN_EMAILS.length ? ADMIN_EMAILS : FALLBACK;

/** The owner list, for showing on the Users page. */
export const OWNER_EMAILS = allowlist;

export const isAdmin = (user) =>
  Boolean(user?.email && allowlist.includes(user.email.toLowerCase()));

// ------------------------------------------------------------
// Dashboard users — extra people the owner lets into /dashboard.
// One Firestore doc per person in `dashboardUsers`, keyed by lower-case
// email. The password lives in Firebase Auth only, never in Firestore.
// ------------------------------------------------------------

export const DASHBOARD_USERS = "dashboardUsers";

const normalise = (email) => (email || "").trim().toLowerCase();

/** Owner, or on the dashboard users list. */
export async function canAccessDashboard(user) {
  if (!user?.email) return false;
  if (isAdmin(user)) return true;
  try {
    const snap = await getDoc(doc(db, DASHBOARD_USERS, normalise(user.email)));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function listDashboardUsers() {
  const snap = await getDocs(collection(db, DASHBOARD_USERS));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Create the sign-in account (or confirm the password of an existing one)
 * and add the email to the dashboard users list.
 */
export async function addDashboardUser({ email, password, name = "" }, addedBy) {
  const address = normalise(email);
  const staffAuth = getStaffAuth();

  let uid = null;
  try {
    const cred = await createUserWithEmailAndPassword(staffAuth, address, password);
    uid = cred.user.uid;
  } catch (err) {
    if (err.code !== "auth/email-already-in-use") throw err;
    // Already has an account (e.g. a shopper, or removed earlier) — only add
    // them if the password given is theirs, so the owner knows it works.
    try {
      const cred = await signInWithEmailAndPassword(staffAuth, address, password);
      uid = cred.user.uid;
    } catch {
      const e = new Error(
        "This email already has an account with a different password (or signs in with Google)."
      );
      e.code = "auth/existing-account";
      throw e;
    }
  } finally {
    await signOut(staffAuth).catch(() => {});
  }

  const record = {
    email: address,
    name: name.trim(),
    uid,
    addedBy: normalise(addedBy),
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, DASHBOARD_USERS, address), record);
  return { id: address, ...record, createdAt: new Date() };
}

/** Takes away dashboard access. Their sign-in account stays, as a shopper. */
export async function removeDashboardUser(email) {
  await deleteDoc(doc(db, DASHBOARD_USERS, normalise(email)));
}

/** Two-letter avatar initials from a display name or email. */
export const initialsOf = (user) =>
  (user?.displayName || user?.email || "A")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
