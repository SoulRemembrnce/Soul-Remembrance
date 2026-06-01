import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

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
  stripeAccountId?: string;
  stripeAccountEnabled?: boolean;
  createdAt?: Timestamp;
}

export interface AdminStats {
  total: number;
  activeSubscriptions: number;
  verified: number;
  online: number;
}

export async function getAllPractitioners(): Promise<FSPractitionerProfile[]> {
  const q = query(
    collection(db, "practitionerProfiles"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as FSPractitionerProfile) }));
}

export function subscribePractitioners(
  cb: (practitioners: FSPractitionerProfile[]) => void
): () => void {
  const q = query(
    collection(db, "practitionerProfiles"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as FSPractitionerProfile));
  });
}

export async function verifyPractitioner(
  userId: string,
  verified: boolean
): Promise<void> {
  await updateDoc(doc(db, "practitionerProfiles", userId), { verified });
}

export async function toggleSubscription(
  userId: string,
  subscriptionActive: boolean
): Promise<void> {
  await updateDoc(doc(db, "practitionerProfiles", userId), {
    subscriptionActive,
  });
}

export async function deletePractitioner(userId: string): Promise<void> {
  await deleteDoc(doc(db, "practitionerProfiles", userId));
}

// ── Events ─────────────────────────────────────────────────────────────────────

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

export function subscribeEvents(cb: (events: FSEvent[]) => void): () => void {
  return onSnapshot(collection(db, "events"), (snap) => {
    const events = snap.docs
      .map((d) => d.data() as FSEvent)
      .sort((a, b) => a.date.localeCompare(b.date));
    cb(events);
  });
}

export async function saveEvent(event: FSEvent): Promise<void> {
  await setDoc(doc(db, "events", String(event.id)), event);
}

export async function deleteEvent(id: number): Promise<void> {
  await deleteDoc(doc(db, "events", String(id)));
}

export function computeStats(practitioners: FSPractitionerProfile[]): AdminStats {
  return {
    total: practitioners.length,
    activeSubscriptions: practitioners.filter((p) => p.subscriptionActive).length,
    verified: practitioners.filter((p) => p.verified).length,
    online: practitioners.filter((p) => p.online).length,
  };
}
