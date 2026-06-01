import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
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
  cancelled?: boolean;
  cancelledAt?: Timestamp;
  videoLink?: string;
  serviceName?: string;
  serviceDuration?: number;
}

// ─── Services ─────────────────────────────────────────────────────────────────

export interface FSService {
  id: string;
  practitionerId: number;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  online: boolean;
  active: boolean;
  createdAt?: Timestamp;
}

export function subscribeServices(
  practitionerId: number,
  cb: (services: FSService[]) => void
): () => void {
  const q = query(
    collection(db, "services"),
    where("practitionerId", "==", practitionerId),
    where("active", "==", true)
  );
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map((d) => d.data() as FSService);
    docs.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
    cb(docs);
  });
}

export async function addService(
  practitionerId: number,
  data: Omit<FSService, "id" | "practitionerId" | "active" | "createdAt">
): Promise<void> {
  const id = `${practitionerId}_${Date.now()}`;
  await setDoc(doc(db, "services", id), {
    id,
    practitionerId,
    ...data,
    active: true,
    createdAt: serverTimestamp(),
  });
}

export async function updateService(
  id: string,
  data: Partial<Omit<FSService, "id" | "practitionerId" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "services", id), data);
}

export async function deleteService(id: string): Promise<void> {
  await updateDoc(doc(db, "services", id), { active: false });
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
    const docs = snap.docs
      .map((d) => d.data() as FSBooking)
      .filter((b) => !b.cancelled);
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

// ─── Messaging ────────────────────────────────────────────────────────────────

export interface FSConversation {
  id: string;
  userId: string;
  practitionerId: number;
  otherName: string;
  otherInitials: string;
  otherAvatarColor: [string, string];
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  unreadCount: number;
  createdAt: Timestamp;
}

export interface FSMessage {
  id: string;
  text: string;
  senderId: string; // userId or "prac_{practitionerId}"
  createdAt: Timestamp;
}

export function subscribeConversations(
  userId: string,
  cb: (convs: FSConversation[]) => void
): () => void {
  const q = query(
    collection(db, "conversations"),
    where("userId", "==", userId),
    orderBy("lastMessageAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as FSConversation));
  });
}

export function subscribeMessages(
  conversationId: string,
  cb: (msgs: FSMessage[]) => void
): () => void {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as FSMessage));
  });
}

export async function createConversation(
  userId: string,
  practitionerId: number,
  otherName: string,
  otherInitials: string,
  otherAvatarColor: [string, string]
): Promise<string> {
  const convId = `${userId}_prac_${practitionerId}`;
  const ref = doc(db, "conversations", convId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      id: convId,
      userId,
      practitionerId,
      otherName,
      otherInitials,
      otherAvatarColor,
      lastMessage: "Booking confirmed — say hello! 👋",
      lastMessageAt: serverTimestamp(),
      unreadCount: 0,
      createdAt: serverTimestamp(),
    });
  }
  return convId;
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<void> {
  const msgId = `${senderId}_${Date.now()}`;
  await setDoc(
    doc(db, "conversations", conversationId, "messages", msgId),
    { id: msgId, text, senderId, createdAt: serverTimestamp() }
  );
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    unreadCount: 0,
  });
}

export async function getConversation(
  conversationId: string
): Promise<FSConversation | null> {
  const snap = await getDoc(doc(db, "conversations", conversationId));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as FSConversation;
}

export async function markConversationRead(
  conversationId: string
): Promise<void> {
  await updateDoc(doc(db, "conversations", conversationId), { unreadCount: 0 });
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
  videoLink?: string;
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

export async function setSlotVideoLink(
  slot: FSAvailabilitySlot,
  videoLink: string
): Promise<void> {
  // Update the availability slot
  await updateDoc(doc(db, "availability", slot.id), { videoLink });

  // Propagate to the matching booking document
  if (slot.bookedBy) {
    const q = query(
      collection(db, "bookings"),
      where("practitionerId", "==", slot.practitionerId),
      where("userId", "==", slot.bookedBy),
      where("date", "==", slot.date),
      where("time", "==", slot.time)
    );
    const snap = await getDocs(q);
    await Promise.all(
      snap.docs.map((d) => updateDoc(doc(db, "bookings", d.id), { videoLink }))
    );
  }
}

export async function cancelBookingByPractitioner(
  slot: FSAvailabilitySlot
): Promise<void> {
  // Find the matching booking document
  const q = query(
    collection(db, "bookings"),
    where("practitionerId", "==", slot.practitionerId),
    where("userId", "==", slot.bookedBy ?? ""),
    where("date", "==", slot.date),
    where("time", "==", slot.time)
  );
  const snap = await getDocs(q);

  // Mark all matching bookings cancelled
  await Promise.all(
    snap.docs.map((d) =>
      updateDoc(doc(db, "bookings", d.id), {
        cancelled: true,
        cancelledAt: serverTimestamp(),
      })
    )
  );

  // Free the availability slot
  await updateDoc(doc(db, "availability", slot.id), {
    booked: false,
    bookedBy: null,
  });
}

export async function addAvailabilitySlot(
  practitionerNumericId: number,
  dateISO: string,
  dateLabel: string,
  timeISO: string,
  timeLabel: string
): Promise<void> {
  const timeSlug = timeISO.replace(":", "");
  const id = `${practitionerNumericId}_${dateISO}_${timeSlug}`;
  await setDoc(doc(db, "availability", id), {
    id,
    practitionerId: practitionerNumericId,
    date: dateLabel,
    dateISO,
    time: timeLabel,
    timeISO,
    booked: false,
  });
}

export async function deleteAvailabilitySlot(slotId: string): Promise<void> {
  await deleteDoc(doc(db, "availability", slotId));
}

// ─── Practitioner Profiles (real, onboarded practitioners) ───────────────────

export interface FSPractitionerProfile {
  userId: string;
  numericId: number;
  name: string;
  initials: string;
  title: string;
  location: string;
  city: string;
  country: string;
  bio: string;
  modalities: string[];
  rate: number;
  years: string;
  avatarColor: [string, string];
  rating: number;
  reviewCount: number;
  online: boolean;
  verified: boolean;
  subscriptionActive: boolean;
  email?: string;
  photoURL?: string;
  stripeAccountId?: string;
  stripeAccountEnabled?: boolean;
  createdAt?: Timestamp;
}

export function profileToPractitioner(p: FSPractitionerProfile) {
  return {
    id: p.numericId,
    name: p.name,
    initials: p.initials,
    avatarColor: p.avatarColor as string[],
    title: p.title,
    location: p.location,
    city: p.city,
    country: p.country,
    lat: 0,
    lon: 0,
    rating: p.rating,
    reviews: p.reviewCount,
    tags: p.modalities.slice(0, 3),
    verified: p.verified,
    price: p.rate,
    bio: p.bio,
    modalities: p.modalities,
    nextAvail: "Contact to book",
    online: p.online,
    ...(p.photoURL && { photoURL: p.photoURL }),
  };
}

export async function updatePractitionerPhotoURL(
  userId: string,
  photoURL: string
): Promise<void> {
  await updateDoc(doc(db, "practitionerProfiles", userId), { photoURL });
}

export async function savePractitionerProfile(
  profile: FSPractitionerProfile
): Promise<void> {
  await setDoc(doc(db, "practitionerProfiles", profile.userId), profile);
}

export async function getPractitionerProfileByNumericId(
  numericId: number
): Promise<FSPractitionerProfile | null> {
  const q = query(
    collection(db, "practitionerProfiles"),
    where("numericId", "==", numericId),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as FSPractitionerProfile);
}

export function subscribePractitionerProfiles(
  cb: (profiles: FSPractitionerProfile[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, "practitionerProfiles"),
      where("subscriptionActive", "==", true)
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as FSPractitionerProfile))
  );
}

export function subscribePractitionerProfile(
  userId: string,
  cb: (profile: FSPractitionerProfile | null) => void
): () => void {
  return onSnapshot(doc(db, "practitionerProfiles", userId), (snap) => {
    cb(snap.exists() ? (snap.data() as FSPractitionerProfile) : null);
  });
}

export async function updatePractitionerStripeAccount(
  userId: string,
  stripeAccountId: string,
  stripeAccountEnabled: boolean
): Promise<void> {
  await updateDoc(doc(db, "practitionerProfiles", userId), {
    stripeAccountId,
    stripeAccountEnabled,
  });
}

export async function updatePractitionerSubscription(
  userId: string,
  data: {
    subscriptionActive: boolean;
    subscriptionId?: string;
    stripeCustomerId?: string;
  }
): Promise<void> {
  await updateDoc(doc(db, "practitionerProfiles", userId), {
    subscriptionActive: data.subscriptionActive,
    ...(data.subscriptionId !== undefined && { subscriptionId: data.subscriptionId }),
    ...(data.stripeCustomerId !== undefined && { stripeCustomerId: data.stripeCustomerId }),
  });
}
