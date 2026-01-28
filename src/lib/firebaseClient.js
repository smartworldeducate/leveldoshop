// lib/firebaseClient.js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAO1Ai3T1DsFVEdrl71Cwj_GTZtIsyNDDQ",
  authDomain: "leveldo-43cdc.firebaseapp.com",
  projectId: "leveldo-43cdc",
  storageBucket: "leveldo-43cdc.appspot.com",
  messagingSenderId: "963853518910",
  appId: "1:963853518910:android:46a11a3b34bf9750c1296f",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
