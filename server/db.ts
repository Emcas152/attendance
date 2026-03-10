import { applicationDefault, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getEnv(name: string) {
  return process.env[name]?.trim();
}

function getServiceAccountCredential() {
  const projectId = getEnv("FIREBASE_PROJECT_ID");
  const clientEmail = getEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = getEnv("FIREBASE_PRIVATE_KEY");

  if (!projectId || !clientEmail || !privateKey) {
    return applicationDefault();
  }

  return cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  });
}

const firebaseApp = getApps().find((app) => app.name === "attendance-server")
  ?? initializeApp({
    credential: getServiceAccountCredential(),
    projectId: getEnv("FIREBASE_PROJECT_ID"),
    storageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
  }, "attendance-server");

const db = getFirestore(getApps().find((app) => app.name === "attendance-server") ?? getApp("attendance-server"));

export { firebaseApp, db };
