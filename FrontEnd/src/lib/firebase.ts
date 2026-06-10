import { getApps, initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCrhBT6XhNmPfVhJHE3DGOIs9A-cm_UawQ",
  authDomain: "sensor-gas-3843e.firebaseapp.com",
  databaseURL: "https://sensor-gas-3843e-default-rtdb.firebaseio.com",
  projectId: "sensor-gas-3843e",
  storageBucket: "sensor-gas-3843e.firebasestorage.app",
  messagingSenderId: "304699765428",
  appId: "1:304699765428:web:b21e7b7cb0101b74b9dde1",
  measurementId: "G-7K5P7ZHXM3",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);

let authReadyPromise: Promise<void> | null = null;

/** Ensures the client is authenticated before RTDB reads (rules: auth != null). */
export function ensureFirebaseAuth(): Promise<void> {
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve();
        return;
      }

      try {
        await signInAnonymously(auth);
      } catch (error) {
        unsubscribe();
        authReadyPromise = null;
        reject(error);
      }
    });
  });

  return authReadyPromise;
}
