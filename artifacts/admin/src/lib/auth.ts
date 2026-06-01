import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null): boolean {
  if (!email) return false;
  // If no admin emails configured, allow any signed-in user (dev fallback)
  if (ADMIN_EMAILS.length === 0) return true;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Sign in with Google, then — if the email passes the admin gate — write a
 * sentinel document to /admins/{uid} so Firestore security rules can identify
 * this user as an admin on subsequent reads/writes.
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  if (isAdminEmail(user.email)) {
    try {
      await setDoc(
        doc(db, "admins", user.uid),
        { email: user.email, registeredAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {
      // Non-fatal: rules may not yet be deployed. The admin panel will still
      // enforce the email gate; Firestore writes will fail gracefully.
    }
  }

  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
