import {
  collection,
  deleteDoc,
  deleteField,
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
  featuredUntil?: Timestamp;
  createdAt?: Timestamp;
}

export interface AdminStats {
  total: number;
  activeSubscriptions: number;
  verified: number;
  featured: number;
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

/** Set or clear the featured placement for a practitioner.
 *  Pass `null` to remove the featured status immediately. */
export async function setFeaturedUntil(
  userId: string,
  until: Date | null
): Promise<void> {
  await updateDoc(doc(db, "practitionerProfiles", userId), {
    featuredUntil: until ? Timestamp.fromDate(until) : deleteField(),
  });
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
  const now = new Date();
  return {
    total: practitioners.length,
    activeSubscriptions: practitioners.filter((p) => p.subscriptionActive).length,
    verified: practitioners.filter((p) => p.verified).length,
    featured: practitioners.filter(
      (p) => p.featuredUntil && p.featuredUntil.toDate() > now
    ).length,
  };
}

export function isFeaturedActive(p: FSPractitionerProfile): boolean {
  return !!p.featuredUntil && p.featuredUntil.toDate() > new Date();
}

// ── Verification Applications ───────────────────────────────────────────────

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

export function subscribeVerificationApplications(
  cb: (applications: FSVerificationApplication[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, "verificationApplications"),
      orderBy("submittedAt", "desc")
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as FSVerificationApplication)),
    () => cb([])
  );
}

export async function approveVerificationApplication(
  applicationId: string,
  practitionerUid: string
): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, "verificationApplications", applicationId), {
      status: "approved",
      reviewedAt: new Date().toISOString(),
    }),
    updateDoc(doc(db, "practitionerProfiles", practitionerUid), {
      verified: true,
    }),
  ]);
}

export async function rejectVerificationApplication(
  applicationId: string,
  note?: string
): Promise<void> {
  await updateDoc(doc(db, "verificationApplications", applicationId), {
    status: "rejected",
    rejectionNote: note ?? "",
    reviewedAt: new Date().toISOString(),
  });
}
