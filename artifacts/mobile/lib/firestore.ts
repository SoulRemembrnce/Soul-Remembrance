import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
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

export interface FSServiceTier {
  durationMinutes: number;
  price: number;
  label?: string;
}

export interface FSService {
  id: string;
  practitionerId: number;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  online: boolean;
  active: boolean;
  isRetreat?: boolean;
  capacity?: number;
  bookedCount?: number;
  waitlistCount?: number;
  priceTiers?: FSServiceTier[];
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
  }, () => { cb([]); });
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
  }, () => { cb([]); });
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
  }, () => { cb([]); });
}

export async function seedEvents(events: FSEvent[]): Promise<void> {
  const col = collection(db, "events");
  const snap = await getDocs(col);
  // If local events list is empty, delete any seeded data that exists in Firestore
  if (events.length === 0) {
    if (!snap.empty) {
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }
    return;
  }
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
  }, () => { cb([]); });
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
  }, () => { cb([]); });
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
  }, () => { cb([]); });
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
  }, () => { cb([]); });
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
  }, () => { cb([]); });
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

// ─── Group Chats (Retreat Communities) ───────────────────────────────────────

export interface FSGroupChat {
  id: string;
  retreatTitle: string;
  serviceId: string;
  practitionerId: number;
  practitionerName: string;
  practitionerInitials: string;
  avatarColor: [string, string];
  memberUids: string[];
  memberNames: Record<string, string>;
  memberInitials: Record<string, string>;
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  unreadCounts: Record<string, number>;
  createdAt: Timestamp;
}

export interface FSGroupMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  createdAt: Timestamp;
}

export async function createOrJoinRetreatChat(
  userId: string,
  userName: string,
  userInitials: string,
  serviceId: string,
  practitionerId: number,
  practitionerName: string,
  practitionerInitials: string,
  avatarColor: [string, string],
  retreatTitle: string,
  practitionerUid?: string
): Promise<string> {
  const chatId = `retreat_${practitionerId}_${serviceId}`;
  const ref = doc(db, "groupChats", chatId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const memberUids = [userId];
    const memberNames: Record<string, string> = { [userId]: userName };
    const memberInits: Record<string, string> = { [userId]: userInitials };
    if (practitionerUid && practitionerUid !== userId) {
      memberUids.push(practitionerUid);
      memberNames[practitionerUid] = practitionerName;
      memberInits[practitionerUid] = practitionerInitials;
    }
    await setDoc(ref, {
      id: chatId,
      retreatTitle,
      serviceId,
      practitionerId,
      practitionerName,
      practitionerInitials,
      avatarColor,
      memberUids,
      memberNames,
      memberInitials: memberInits,
      lastMessage: `${userName} joined the retreat`,
      lastMessageAt: serverTimestamp(),
      unreadCounts: {},
      createdAt: serverTimestamp(),
    });
  } else {
    const updates: Record<string, any> = {
      lastMessage: `${userName} joined the retreat`,
      lastMessageAt: serverTimestamp(),
      [`memberNames.${userId}`]: userName,
      [`memberInitials.${userId}`]: userInitials,
    };
    if (practitionerUid && practitionerUid !== userId) {
      updates.memberUids = arrayUnion(userId, practitionerUid);
      updates[`memberNames.${practitionerUid}`] = practitionerName;
      updates[`memberInitials.${practitionerUid}`] = practitionerInitials;
    } else {
      updates.memberUids = arrayUnion(userId);
    }
    await updateDoc(ref, updates);
  }
  return chatId;
}

export function subscribeGroupChats(
  userId: string,
  cb: (chats: FSGroupChat[]) => void
): () => void {
  const q = query(
    collection(db, "groupChats"),
    where("memberUids", "array-contains", userId),
    orderBy("lastMessageAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => { cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as FSGroupChat)); },
    () => { cb([]); }
  );
}

export function subscribeGroupMessages(
  chatId: string,
  cb: (msgs: FSGroupMessage[]) => void
): () => void {
  const q = query(
    collection(db, "groupChats", chatId, "messages"),
    orderBy("createdAt", "asc"),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => { cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as FSGroupMessage)); },
    () => { cb([]); }
  );
}

export async function sendGroupMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  senderInitials: string,
  text: string,
  memberUids: string[] = []
): Promise<void> {
  const msgId = `${senderId}_${Date.now()}`;
  await setDoc(doc(db, "groupChats", chatId, "messages", msgId), {
    id: msgId,
    text,
    senderId,
    senderName,
    senderInitials,
    createdAt: serverTimestamp(),
  });
  // Build unread increments for all members except the sender
  const unreadIncrements: Record<string, ReturnType<typeof increment>> = {};
  for (const uid of memberUids) {
    if (uid !== senderId) {
      unreadIncrements[`unreadCounts.${uid}`] = increment(1);
    }
  }
  await updateDoc(doc(db, "groupChats", chatId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    ...unreadIncrements,
  });
}

export async function markGroupChatRead(
  chatId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, "groupChats", chatId), {
    [`unreadCounts.${userId}`]: 0,
  });
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export interface FSWaitlistEntry {
  id: string;
  serviceId: string;
  practitionerId: number;
  practitionerUid: string;
  userId: string;
  userName: string;
  userEmail: string;
  userInitials: string;
  joinedAt: Timestamp;
}

export async function incrementServiceBookedCount(serviceId: string): Promise<void> {
  await updateDoc(doc(db, "services", serviceId), { bookedCount: increment(1) });
}

export async function joinWaitlist(
  entry: Omit<FSWaitlistEntry, "id" | "joinedAt">
): Promise<void> {
  const id = `${entry.userId}_${entry.serviceId}`;
  await setDoc(doc(db, "waitlist", id), {
    ...entry,
    id,
    joinedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "services", entry.serviceId), { waitlistCount: increment(1) });
}

export async function leaveWaitlist(serviceId: string, userId: string): Promise<void> {
  const id = `${userId}_${serviceId}`;
  await deleteDoc(doc(db, "waitlist", id));
  await updateDoc(doc(db, "services", serviceId), { waitlistCount: increment(-1) });
}

export async function getUserWaitlistEntry(
  serviceId: string,
  userId: string
): Promise<FSWaitlistEntry | null> {
  const snap = await getDoc(doc(db, "waitlist", `${userId}_${serviceId}`));
  if (!snap.exists()) return null;
  return snap.data() as FSWaitlistEntry;
}

export function subscribeWaitlistByService(
  serviceId: string,
  cb: (entries: FSWaitlistEntry[]) => void
): () => void {
  const q = query(
    collection(db, "waitlist"),
    where("serviceId", "==", serviceId),
    orderBy("joinedAt", "asc")
  );
  return onSnapshot(
    q,
    (snap) => { cb(snap.docs.map((d) => d.data() as FSWaitlistEntry)); },
    () => { cb([]); }
  );
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
  }, () => { cb([]); });
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
  featuredUntil?: Timestamp;
  createdAt?: Timestamp;
  credentialURLs?: Record<string, string>;
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

export async function setFeaturedUntil(userId: string, date: Date): Promise<void> {
  await updateDoc(doc(db, "practitionerProfiles", userId), {
    featuredUntil: Timestamp.fromDate(date),
  });
}

export async function savePractitionerProfile(
  profile: FSPractitionerProfile
): Promise<void> {
  await setDoc(doc(db, "practitionerProfiles", profile.userId), {
    ...profile,
    createdAt: profile.createdAt ?? serverTimestamp(),
  });
}

// ─── Push tokens ──────────────────────────────────────────────────────────────

export async function savePushToken(userId: string, token: string): Promise<void> {
  await setDoc(doc(db, "pushTokens", userId), {
    token,
    updatedAt: serverTimestamp(),
  });
}

export async function getPushTokenForUserId(userId: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, "pushTokens", userId));
    if (!snap.exists()) return null;
    return (snap.data().token as string) ?? null;
  } catch {
    return null;
  }
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
    (snap) => cb(snap.docs.map((d) => d.data() as FSPractitionerProfile)),
    () => { cb([]); }
  );
}

export function subscribePractitionerProfile(
  userId: string,
  cb: (profile: FSPractitionerProfile | null) => void
): () => void {
  return onSnapshot(
    doc(db, "practitionerProfiles", userId),
    (snap) => { cb(snap.exists() ? (snap.data() as FSPractitionerProfile) : null); },
    () => { cb(null); }
  );
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

// ─── Journal ──────────────────────────────────────────────────────────────────

export interface FSJournalEntry {
  id: string;
  text: string;
  mood: string;
  moodLabel: string;
  createdAt: string;
}

export async function addJournalEntry(
  uid: string,
  entry: { text: string; mood: string; moodLabel: string }
): Promise<string> {
  const ref = doc(collection(db, "users", uid, "journal"));
  await setDoc(ref, {
    text: entry.text,
    mood: entry.mood,
    moodLabel: entry.moodLabel,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeJournalEntries(
  uid: string,
  cb: (entries: FSJournalEntry[]) => void
): () => void {
  const q = query(
    collection(db, "users", uid, "journal"),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt as Timestamp | null;
          return {
            id: d.id,
            text: data.text ?? "",
            mood: data.mood ?? "😌",
            moodLabel: data.moodLabel ?? "Calm",
            createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
          };
        })
      );
    },
    (err) => { console.warn("[Journal] Firestore read error:", err.code, err.message); cb([]); }
  );
}

export async function deleteJournalEntry(uid: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "journal", entryId));
}

// ─── Gratitude ────────────────────────────────────────────────────────────────

export interface FSGratitudeEntry {
  id: string;
  text: string;
  createdAt: string;
}

export async function addGratitudeEntry(uid: string, text: string): Promise<string> {
  const ref = doc(collection(db, "users", uid, "gratitude"));
  await setDoc(ref, { text, createdAt: serverTimestamp() });
  return ref.id;
}

export function subscribeGratitudeEntries(
  uid: string,
  cb: (entries: FSGratitudeEntry[]) => void
): () => void {
  const q = query(
    collection(db, "users", uid, "gratitude"),
    orderBy("createdAt", "desc"),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt as Timestamp | null;
          return {
            id: d.id,
            text: data.text ?? "",
            createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
          };
        })
      );
    },
    (err) => { console.warn("[Gratitude] Firestore read error:", err.code, err.message); cb([]); }
  );
}

export async function deleteGratitudeEntry(uid: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "gratitude", entryId));
}

// ─── Vision Board ─────────────────────────────────────────────────────────────

export interface FSVisionBoardItem {
  id: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
}

export async function addVisionBoardItem(
  uid: string,
  item: { imageUrl: string; caption: string }
): Promise<string> {
  const ref = doc(collection(db, "users", uid, "visionBoard"));
  await setDoc(ref, {
    imageUrl: item.imageUrl,
    caption: item.caption,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeVisionBoardItems(
  uid: string,
  cb: (items: FSVisionBoardItem[]) => void
): () => void {
  const q = query(
    collection(db, "users", uid, "visionBoard"),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt as Timestamp | null;
          return {
            id: d.id,
            imageUrl: data.imageUrl ?? "",
            caption: data.caption ?? "",
            createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
          };
        })
      );
    },
    (err) => { console.warn("[VisionBoard] Firestore read error:", err.code, err.message); cb([]); }
  );
}

export async function deleteVisionBoardItem(uid: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "visionBoard", itemId));
}

// ─── Mood Tracker ─────────────────────────────────────────────────────────────

export interface FSMoodCheckin {
  id: string;
  mood: string;
  moodLabel: string;
  moodScore: number;
  note: string;
  dateKey: string;
  createdAt: string;
}

export async function addMoodCheckin(
  uid: string,
  entry: { mood: string; moodLabel: string; moodScore: number; note: string; dateKey: string }
): Promise<string> {
  const ref = doc(collection(db, "users", uid, "moodCheckins"));
  await setDoc(ref, { ...entry, createdAt: serverTimestamp() });
  return ref.id;
}

export function subscribeMoodCheckins(
  uid: string,
  cb: (entries: FSMoodCheckin[]) => void
): () => void {
  const q = query(
    collection(db, "users", uid, "moodCheckins"),
    orderBy("createdAt", "desc"),
    limit(90)
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt as Timestamp | null;
          return {
            id: d.id,
            mood: data.mood ?? "😌",
            moodLabel: data.moodLabel ?? "Calm",
            moodScore: data.moodScore ?? 5,
            note: data.note ?? "",
            dateKey: data.dateKey ?? "",
            createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
          };
        })
      );
    },
    (err) => { console.warn("[MoodTracker] Firestore read error:", err.code, err.message); cb([]); }
  );
}

export async function deleteMoodCheckin(uid: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "moodCheckins", entryId));
}

// ─── Affirmations ─────────────────────────────────────────────────────────────

export interface FSFavouriteAffirmation {
  id: string;
  text: string;
  category: string;
  affirmationId: string;
  addedAt: string;
}

export interface FSCustomAffirmation {
  id: string;
  text: string;
  createdAt: string;
}

export async function addFavouriteAffirmation(
  uid: string,
  entry: { text: string; category: string; affirmationId: string }
): Promise<string> {
  const ref = doc(collection(db, "users", uid, "affirmationFavourites"));
  await setDoc(ref, { ...entry, addedAt: serverTimestamp() });
  return ref.id;
}

export async function removeFavouriteAffirmation(uid: string, docId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "affirmationFavourites", docId));
}

export function subscribeFavouriteAffirmations(
  uid: string,
  cb: (entries: FSFavouriteAffirmation[]) => void
): () => void {
  const q = query(
    collection(db, "users", uid, "affirmationFavourites"),
    orderBy("addedAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          const ts = data.addedAt as Timestamp | null;
          return {
            id: d.id,
            text: data.text ?? "",
            category: data.category ?? "",
            affirmationId: data.affirmationId ?? "",
            addedAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
          };
        })
      );
    },
    () => cb([])
  );
}

export async function addCustomAffirmation(uid: string, text: string): Promise<string> {
  const ref = doc(collection(db, "users", uid, "customAffirmations"));
  await setDoc(ref, { text, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteCustomAffirmation(uid: string, docId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "customAffirmations", docId));
}

export function subscribeCustomAffirmations(
  uid: string,
  cb: (entries: FSCustomAffirmation[]) => void
): () => void {
  const q = query(
    collection(db, "users", uid, "customAffirmations"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt as Timestamp | null;
          return {
            id: d.id,
            text: data.text ?? "",
            createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
          };
        })
      );
    },
    () => cb([])
  );
}

// ─── Following ────────────────────────────────────────────────────────────────

export function subscribeFollowing(
  uid: string,
  cb: (ids: number[]) => void
): () => void {
  const q = query(collection(db, "following"), where("userId", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => (d.data() as { practitionerId: number }).practitionerId));
    },
    () => cb([])
  );
}

export async function addFollowingToFirestore(
  userId: string,
  practitionerId: number
): Promise<void> {
  await setDoc(doc(db, "following", `${userId}_${practitionerId}`), {
    userId,
    practitionerId,
  });
}

export async function removeFollowingFromFirestore(
  userId: string,
  practitionerId: number
): Promise<void> {
  await deleteDoc(doc(db, "following", `${userId}_${practitionerId}`));
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface FSUserProfile {
  retreatsAttended?: number;
}

export function subscribeUserProfile(
  uid: string,
  cb: (profile: FSUserProfile) => void
): () => void {
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => {
      cb(snap.exists() ? (snap.data() as FSUserProfile) : {});
    },
    () => cb({})
  );
}

// ─── Waiver Templates ─────────────────────────────────────────────────────────

export interface FSWaiverTemplate {
  id: string;
  practitionerNumericId: number;
  practitionerUid: string;
  practitionerName: string;
  title: string;
  content: string;
  createdAt: string;
}

export async function createWaiverTemplate(
  data: Omit<FSWaiverTemplate, "id" | "createdAt">
): Promise<string> {
  const ref = doc(collection(db, "waiverTemplates"));
  await setDoc(ref, { ...data, id: ref.id, createdAt: new Date().toISOString() });
  return ref.id;
}

export async function getWaiverByNumericId(
  numericId: number
): Promise<FSWaiverTemplate | null> {
  const snap = await getDocs(
    query(
      collection(db, "waiverTemplates"),
      where("practitionerNumericId", "==", numericId),
      limit(1)
    )
  );
  return snap.empty ? null : (snap.docs[0].data() as FSWaiverTemplate);
}

export async function getWaiverByUid(
  practitionerUid: string
): Promise<FSWaiverTemplate | null> {
  const snap = await getDocs(
    query(
      collection(db, "waiverTemplates"),
      where("practitionerUid", "==", practitionerUid)
    )
  );
  if (snap.empty) return null;
  const templates = snap.docs
    .map((d) => d.data() as FSWaiverTemplate)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return templates[0];
}

export function subscribePractitionerWaivers(
  practitionerUid: string,
  cb: (templates: FSWaiverTemplate[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, "waiverTemplates"),
      where("practitionerUid", "==", practitionerUid)
    ),
    (snap) => cb(
      snap.docs
        .map((d) => d.data() as FSWaiverTemplate)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    ),
    (err) => { onError?.(err); cb([]); }
  );
}

export async function deleteWaiverTemplate(templateId: string): Promise<void> {
  await deleteDoc(doc(db, "waiverTemplates", templateId));
}

// ─── Waiver Signatures ────────────────────────────────────────────────────────

export interface FSWaiverSignature {
  id: string;
  userId: string;
  templateId: string;
  practitionerNumericId: number;
  practitionerName: string;
  waiverTitle: string;
  signedName: string;
  agreedAt: string;
}

export async function saveWaiverSignature(
  data: Omit<FSWaiverSignature, "id" | "agreedAt">
): Promise<string> {
  const ref = doc(collection(db, "waiverSignatures"));
  await setDoc(ref, { ...data, id: ref.id, agreedAt: new Date().toISOString() });
  return ref.id;
}

export function subscribeSignedWaivers(
  userId: string,
  cb: (signatures: FSWaiverSignature[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, "waiverSignatures"),
      where("userId", "==", userId)
    ),
    (snap) => cb(
      snap.docs
        .map((d) => d.data() as FSWaiverSignature)
        .sort((a, b) => b.agreedAt.localeCompare(a.agreedAt))
    ),
    () => cb([])
  );
}

export function subscribePractitionerWaiverSignatures(
  practitionerNumericId: number,
  cb: (signatures: FSWaiverSignature[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, "waiverSignatures"),
      where("practitionerNumericId", "==", practitionerNumericId)
    ),
    (snap) => cb(
      snap.docs
        .map((d) => d.data() as FSWaiverSignature)
        .sort((a, b) => b.agreedAt.localeCompare(a.agreedAt))
    ),
    () => cb([])
  );
}

// ─── Shop Orders ──────────────────────────────────────────────────────────────

export interface FSShopOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  emoji: string;
}

export interface FSShopOrder {
  id: string;
  userId: string;
  items: FSShopOrderItem[];
  total: number;
  shippingName: string;
  shippingLine1: string;
  shippingCity: string;
  shippingPostcode: string;
  paymentIntentId: string;
  status: "paid";
  createdAt: string;
}

export async function saveShopOrder(
  data: Omit<FSShopOrder, "id" | "status" | "createdAt">
): Promise<string> {
  const ref = doc(collection(db, "shopOrders"));
  await setDoc(ref, {
    ...data,
    id: ref.id,
    status: "paid",
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

// ─── Verification Applications ────────────────────────────────────────────────

export interface FSVerificationApplication {
  id: string;
  practitionerUid: string;
  status: "pending" | "approved" | "rejected";
  rejectionNote?: string;
  documents: {
    certificates: string[];
    insurance: string;
    dbs: string;
  };
  paymentIntentId: string;
  submittedAt: string;
  reviewedAt?: string;
}

export async function createVerificationApplication(
  data: Omit<FSVerificationApplication, "id" | "submittedAt">
): Promise<string> {
  const ref = doc(collection(db, "verificationApplications"));
  await setDoc(ref, { ...data, id: ref.id, submittedAt: new Date().toISOString() });
  return ref.id;
}

// ─── Dream Journal ─────────────────────────────────────────────────────────────

export interface FSDreamEntry {
  id: string;
  date: string;
  description: string;
  dreamEmotions: string[];
  wakingEmotions: string[];
  reflection?: string;
  moonPhase: string;
  moonEmoji: string;
  moonIllumination: number;
  createdAt: Timestamp;
}

export async function addDreamEntry(
  userId: string,
  data: Omit<FSDreamEntry, "id" | "createdAt">
): Promise<string> {
  const ref = doc(collection(db, "dreamJournal", userId, "entries"));
  await setDoc(ref, { ...data, id: ref.id, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteDreamEntry(userId: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, "dreamJournal", userId, "entries", entryId));
}

export function subscribeDreamEntries(
  userId: string,
  cb: (entries: FSDreamEntry[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, "dreamJournal", userId, "entries"),
      orderBy("date", "desc")
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as FSDreamEntry)),
    () => cb([])
  );
}

export function subscribeVerificationApplicationByUid(
  uid: string,
  cb: (app: FSVerificationApplication | null) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, "verificationApplications"),
      where("practitionerUid", "==", uid)
    ),
    (snap) => {
      if (snap.empty) { cb(null); return; }
      const sorted = snap.docs
        .map((d) => d.data() as FSVerificationApplication)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
      cb(sorted[0]);
    },
    () => cb(null)
  );
}

// ─── Vendor Applications ──────────────────────────────────────────────────────

export interface FSVendorApplication {
  id: string;
  userId: string;
  businessName: string;
  description: string;
  categories: string[];
  contactEmail: string;
  website?: string;
  status: "pending" | "approved" | "rejected";
  rejectionNote?: string;
  submittedAt: string;
  reviewedAt?: string;
  tier?: "basic" | "verified";
  featuredPaid?: boolean;
  paymentIntentId?: string;
}

export async function createVendorApplication(
  data: Omit<FSVendorApplication, "id" | "status" | "submittedAt">
): Promise<string> {
  const ref = doc(collection(db, "vendorApplications"));
  await setDoc(ref, {
    ...data,
    id: ref.id,
    status: "pending",
    submittedAt: new Date().toISOString(),
  });
  return ref.id;
}

export function subscribeVendorApplicationByUid(
  userId: string,
  cb: (app: FSVendorApplication | null) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, "vendorApplications"),
      where("userId", "==", userId)
    ),
    (snap) => {
      if (snap.empty) { cb(null); return; }
      const sorted = snap.docs
        .map((d) => d.data() as FSVendorApplication)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
      cb(sorted[0]);
    },
    () => cb(null)
  );
}

// ─── Vendor Profiles ──────────────────────────────────────────────────────────

export interface FSVendorProfile {
  userId: string;
  businessName: string;
  description: string;
  categories: string[];
  contactEmail: string;
  website?: string;
  approved: boolean;
  productCount?: number;
  createdAt: string;
  tier?: "basic" | "verified";
  featuredUntil?: string;
}

export function subscribeVendorProfile(
  userId: string,
  cb: (profile: FSVendorProfile | null) => void
): () => void {
  return onSnapshot(
    doc(db, "vendorProfiles", userId),
    (snap) => cb(snap.exists() ? (snap.data() as FSVendorProfile) : null),
    () => cb(null)
  );
}

// ─── Vendor Shop Products ─────────────────────────────────────────────────────

export interface FSVendorProduct {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  description: string;
  price: number;
  category: string;
  emoji: string;
  inStock: boolean;
  imageUrl?: string;
  /** ISO date string — product shows in featured strip until this date.
   *  Missing or past date means not featured. Replaces the old boolean. */
  featuredUntil?: string;
  createdAt: string;
}

export function isProductFeaturedActive(p: FSVendorProduct): boolean {
  return !!p.featuredUntil && new Date(p.featuredUntil) > new Date();
}

export async function createVendorProduct(
  data: Omit<FSVendorProduct, "id" | "createdAt" | "featuredUntil">
): Promise<string> {
  const ref = doc(collection(db, "shopProducts"));
  // Inherit vendor's active featured window so new listings are auto-featured
  let featuredUntil: string | undefined;
  try {
    const { getDoc } = await import("firebase/firestore");
    const profileSnap = await getDoc(doc(db, "vendorProfiles", data.vendorId));
    if (profileSnap.exists()) {
      const profile = profileSnap.data() as FSVendorProfile;
      if (profile.featuredUntil && new Date(profile.featuredUntil) > new Date()) {
        featuredUntil = profile.featuredUntil;
      }
    }
  } catch {
    // Non-critical — product still created, just without featured
  }
  await setDoc(ref, {
    ...data,
    id: ref.id,
    createdAt: new Date().toISOString(),
    ...(featuredUntil ? { featuredUntil } : {}),
  });
  return ref.id;
}

export async function updateVendorProduct(
  productId: string,
  data: Partial<Pick<FSVendorProduct, "name" | "description" | "price" | "category" | "emoji" | "inStock" | "imageUrl">>
): Promise<void> {
  await updateDoc(doc(db, "shopProducts", productId), data);
}

export async function deleteVendorProduct(productId: string): Promise<void> {
  await deleteDoc(doc(db, "shopProducts", productId));
}

export function subscribeVendorProducts(
  vendorId: string,
  cb: (products: FSVendorProduct[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, "shopProducts"),
      where("vendorId", "==", vendorId)
    ),
    (snap) => cb(
      snap.docs
        .map((d) => d.data() as FSVendorProduct)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    ),
    () => cb([])
  );
}

export function subscribeAllShopProducts(
  cb: (products: FSVendorProduct[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, "shopProducts"), where("inStock", "==", true)),
    (snap) => cb(
      snap.docs
        .map((d) => d.data() as FSVendorProduct)
        .sort((a, b) => {
          // Active featured products first, then by createdAt desc
          const aFeat = isProductFeaturedActive(a) ? 1 : 0;
          const bFeat = isProductFeaturedActive(b) ? 1 : 0;
          if (bFeat !== aFeat) return bFeat - aFeat;
          return b.createdAt.localeCompare(a.createdAt);
        })
    ),
    () => cb([])
  );
}

export function subscribeAllVendorProfiles(
  cb: (profiles: FSVendorProfile[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, "vendorProfiles"), where("approved", "==", true)),
    (snap) => cb(snap.docs.map((d) => d.data() as FSVendorProfile)),
    () => cb([])
  );
}

// ─── Vendor Application (with tier) ──────────────────────────────────────────

export async function createVendorApplicationWithTier(
  data: Omit<FSVendorApplication, "id" | "status" | "submittedAt"> & {
    tier: "basic" | "verified";
    featuredPaid?: boolean;
    paymentIntentId?: string;
  }
): Promise<string> {
  const ref = doc(collection(db, "vendorApplications"));
  // Strip undefined values — Firestore rejects them
  const clean = Object.fromEntries(
    Object.entries({ ...data, id: ref.id, status: "pending", submittedAt: new Date().toISOString() })
      .filter(([, v]) => v !== undefined)
  );
  await setDoc(ref, clean);
  return ref.id;
}

