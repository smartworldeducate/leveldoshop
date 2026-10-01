// lib/firebaseClient.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// ✅ Your Firebase config
export const firebaseConfig = {
  apiKey: "AIzaSyAO1Ai3T1DsFVEdrl71Cwj_GTZtIsyNDDQ",
  authDomain: "leveldo-43cdc.firebaseapp.com",
  projectId: "leveldo-43cdc",
  storageBucket: "leveldo-43cdc.appspot.com",
  messagingSenderId: "963853518910",
  appId: "1:963853518910:android:46a11a3b34bf9750c1296f",
};

// Initialize Firebase app
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Firestore
export const db = getFirestore(app);

// ✅ Auth
export const auth = getAuth(app);

// ✅ Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// A second, named app instance used only to create dashboard users. Creating a
// user signs that user in, so doing it on the main `auth` would log the owner
// out; on this instance it only touches a throwaway session.
const STAFF_APP = "staff-admin";
export const getStaffAuth = () => {
  const staffApp = getApps().some((a) => a.name === STAFF_APP)
    ? getApp(STAFF_APP)
    : initializeApp(firebaseConfig, STAFF_APP);
  return getAuth(staffApp);
};
