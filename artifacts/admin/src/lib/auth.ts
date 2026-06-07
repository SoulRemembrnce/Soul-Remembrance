import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword as firebaseSignInWithEmail,
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
  if (ADMIN_EMAILS.length === 0) return true;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

async function markAdmin(user: User) {
  if (isAdminEmail(user.email)) {
    try {
      await setDoc(
        doc(db, "admins", user.uid),
        { email: user.email, registeredAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {
      // Non-fatal
    }
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await firebaseSignInWithEmail(auth, email, password);
  await markAdmin(result.user);
  return result.user;
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  await markAdmin(result.user);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
