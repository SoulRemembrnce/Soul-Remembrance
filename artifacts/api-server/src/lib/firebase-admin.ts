import { App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function initAdmin(): App {
  if (getApps().length > 0) return getApp();

  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not set");

  if (clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  // Fallback: projectId-only (works when running in a Google-managed environment
  // or when GOOGLE_APPLICATION_CREDENTIALS is set externally)
  return initializeApp({ projectId });
}

let _db: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (!_db) {
    initAdmin();
    _db = getFirestore();
  }
  return _db;
}
