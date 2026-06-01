import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
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

export function subscribeBookings(
  userId: string,
  cb: (bs: FSBooking[]) => void
): () => void {
  const q = query(
    collection(db, "bookings"),
    where("userId", "==", userId)
  );
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map((d) => d.data() as FSBooking);
    docs.sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt));
    cb(docs);
  });
}

export async function addBookingToFirestore(
  userId: string,
  booking: Omit<FSBooking, "userId" | "createdAt">
): Promise<void> {
  await setDoc(doc(db, "bookings", booking.id), {
    ...booking,
    userId,
    createdAt: serverTimestamp(),
  });
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export function subscribeFavorites(
  userId: string,
  cb: (ids: number[]) => void
): () => void {
  const q = query(
    collection(db, "favorites"),
    where("userId", "==", userId)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => (d.data() as { practitionerId: number }).practitionerId));
  });
}

export async function addFavoriteToFirestore(
  userId: string,
  practitionerId: number
): Promise<void> {
  await setDoc(
    doc(db, "favorites", `${userId}_${practitionerId}`),
    { userId, practitionerId }
  );
}

export async function removeFavoriteFromFirestore(
  userId: string,
  practitionerId: number
): Promise<void> {
  await deleteDoc(
    doc(db, "favorites", `${userId}_${practitionerId}`)
  );
}

// ─── Community Posts ──────────────────────────────────────────────────────────

export interface FSComment {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  text: string;
  createdAtISO: string; // ISO string — avoids Timestamp issues inside arrayUnion
}

export interface FSPost {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  role: "client" | "practitioner";
  circle: string;
  text: string;
  likedBy: string[];
  comments: FSComment[];
  createdAt: Timestamp;
}

export function subscribePosts(cb: (posts: FSPost[]) => void): () => void {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(60)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as FSPost));
  });
}

export async function addPost(post: Omit<FSPost, "createdAt">): Promise<void> {
  await setDoc(doc(db, "posts", post.id), {
    ...post,
    createdAt: serverTimestamp(),
  });
}

export async function togglePostLike(
  postId: string,
  userId: string,
  currentlyLiked: boolean
): Promise<void> {
  const ref = doc(db, "posts", postId);
  await updateDoc(ref, {
    likedBy: currentlyLiked ? arrayRemove(userId) : arrayUnion(userId),
  });
}

export async function addCommentToPost(
  postId: string,
  comment: FSComment
): Promise<void> {
  await updateDoc(doc(db, "posts", postId), {
    comments: arrayUnion(comment),
  });
}

// ─── Availability ─────────────────────────────────────────────────────────────

export interface FSAvailabilitySlot {
  id: string;           // "{practitionerId}_{dateISO}_{timeSlug}"
  practitionerId: number;
  date: string;         // "Mon 1 Jun"
  dateISO: string;      // "2026-06-01" (for sorting)
  time: string;         // "10:00 AM"
  timeISO: string;      // "10:00" (24h for sorting)
  booked: boolean;
  bookedBy?: string;
}

export function subscribeAvailability(
  practitionerId: number,
  cb: (slots: FSAvailabilitySlot[]) => void
): () => void {
  const q = query(
    collection(db, "availability"),
    where("practitionerId", "==", practitionerId)
  );
  return onSnapshot(q, (snap) => {
    const slots = snap.docs.map((d) => d.data() as FSAvailabilitySlot);
    slots.sort((a, b) =>
      a.dateISO !== b.dateISO
        ? a.dateISO.localeCompare(b.dateISO)
        : a.timeISO.localeCompare(b.timeISO)
    );
    cb(slots);
  });
}

export async function seedAvailability(
  slots: FSAvailabilitySlot[]
): Promise<void> {
  const snap = await getDocs(collection(db, "availability"));
  if (!snap.empty) return;
  // Batch in groups of 50 to stay within Firestore limits
  const CHUNK = 50;
  for (let i = 0; i < slots.length; i += CHUNK) {
    await Promise.all(
      slots.slice(i, i + CHUNK).map((s) =>
        setDoc(doc(db, "availability", s.id), s)
      )
    );
  }
}

export async function markSlotBooked(
  slotId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, "availability", slotId), {
    booked: true,
    bookedBy: userId,
  });
}
