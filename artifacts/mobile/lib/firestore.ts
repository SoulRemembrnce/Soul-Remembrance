import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FSPractitioner {
  id: number;
  name: string;
  initials: string;
  title: string;
  rating: number;
  reviews: number;
  price: number;
  location: string;
  online: boolean;
  tags: string[];
  modalities: string[];
  bio: string;
  avatarColor: [string, string];
  lat?: number;
  lng?: number;
  verified?: boolean;
}

export interface FSEvent {
  id: number;
  title: string;
  host: string;
  hostInitials: string;
  avatarColor: [string, string];
  date: string;
  time: string;
  type: string;
  attendees: number;
  tags: string[];
}

export interface FSReview {
  id: string;
  practitionerId: number;
  authorName: string;
  authorInitials: string;
  avatarColor: [string, string];
  rating: number;
  text: string;
  date: string;
  verified: boolean;
}

export interface FSBooking {
  id: string;
  userId: string;
  practitionerId: number;
  practitionerName: string;
  practitionerInitials: string;
  avatarColor: string[];
  date: string;
  time: string;
  price: number;
  online: boolean;
  location: string;
  confirmedAt: string;
  createdAt?: Timestamp;
}

// ─── Practitioners ────────────────────────────────────────────────────────────

export async function getPractitioners(): Promise<FSPractitioner[]> {
  const snap = await getDocs(collection(db, "practitioners"));
  return snap.docs.map((d) => d.data() as FSPractitioner);
}

export function subscribePractitioners(
  cb: (ps: FSPractitioner[]) => void
): () => void {
  return onSnapshot(collection(db, "practitioners"), (snap) => {
    cb(snap.docs.map((d) => d.data() as FSPractitioner));
  });
}

export async function seedPractitioners(
  practitioners: FSPractitioner[]
): Promise<void> {
  const col = collection(db, "practitioners");
  const snap = await getDocs(col);
  if (!snap.empty) return; // already seeded
  await Promise.all(
    practitioners.map((p) =>
      setDoc(doc(db, "practitioners", String(p.id)), p)
    )
  );
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(): Promise<FSEvent[]> {
  const snap = await getDocs(collection(db, "events"));
  return snap.docs.map((d) => d.data() as FSEvent);
}

export function subscribeEvents(cb: (es: FSEvent[]) => void): () => void {
  return onSnapshot(collection(db, "events"), (snap) => {
    cb(snap.docs.map((d) => d.data() as FSEvent));
  });
}

export async function seedEvents(events: FSEvent[]): Promise<void> {
  const col = collection(db, "events");
  const snap = await getDocs(col);
  if (!snap.empty) return;
  await Promise.all(
    events.map((e) => setDoc(doc(db, "events", String(e.id)), e))
  );
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function getReviewsForPractitioner(
  practitionerId: number
): Promise<FSReview[]> {
  const q = query(
    collection(db, "reviews"),
    where("practitionerId", "==", practitionerId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as FSReview);
}

export function subscribeReviews(
  practitionerId: number,
  cb: (rs: FSReview[]) => void
): () => void {
  const q = query(
    collection(db, "reviews"),
    where("practitionerId", "==", practitionerId)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as FSReview));
  });
}

export async function addReviewToFirestore(review: FSReview): Promise<void> {
  await setDoc(doc(db, "reviews", review.id), review);
}

export async function seedReviews(
  reviews: Record<number, FSReview[]>
): Promise<void> {
  const snap = await getDocs(collection(db, "reviews"));
  if (!snap.empty) return;
  const all = Object.values(reviews).flat();
  await Promise.all(
    all.map((r) => setDoc(doc(db, "reviews", r.id), r))
  );
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

const ANON_USER_ID = "anon_user";

export function subscribeBookings(
  cb: (bs: FSBooking[]) => void
): () => void {
  const q = query(
    collection(db, "bookings"),
    where("userId", "==", ANON_USER_ID)
  );
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map((d) => d.data() as FSBooking);
    // Sort newest first client-side (avoids composite index requirement)
    docs.sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt));
    cb(docs);
  });
}

export async function addBookingToFirestore(
  booking: Omit<FSBooking, "userId" | "createdAt">
): Promise<void> {
  await setDoc(doc(db, "bookings", booking.id), {
    ...booking,
    userId: ANON_USER_ID,
    createdAt: serverTimestamp(),
  });
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export function subscribeFavorites(
  cb: (ids: number[]) => void
): () => void {
  const q = query(
    collection(db, "favorites"),
    where("userId", "==", ANON_USER_ID)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => (d.data() as { practitionerId: number }).practitionerId));
  });
}

export async function addFavoriteToFirestore(
  practitionerId: number
): Promise<void> {
  await setDoc(
    doc(db, "favorites", `${ANON_USER_ID}_${practitionerId}`),
    { userId: ANON_USER_ID, practitionerId }
  );
}

export async function removeFavoriteFromFirestore(
  practitionerId: number
): Promise<void> {
  await deleteDoc(
    doc(db, "favorites", `${ANON_USER_ID}_${practitionerId}`)
  );
}
