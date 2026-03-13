import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

if (apiKey && getApps().length === 0) {
  const firebaseConfig: FirebaseOptions = {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
  initializeApp(firebaseConfig);
}

export const firebaseApp = getApps().length > 0 ? getApp() : null;

if (typeof window !== "undefined" && firebaseApp) {
  void isSupported()
    .then((supported) => {
      if (supported) {
        getAnalytics(firebaseApp);
      }
    })
    .catch(() => undefined);
}
