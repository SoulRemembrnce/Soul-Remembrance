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
  where,
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
  credentialURLs?: Record<string, string>;
  credentialReviewNote?: string;
}

export interface AdminStats {
  total: number;
  activeSubscriptions: number;
  verified: number;
  featured: number;
}

export async function getAllPractitioners(): Promise<FSPractitionerProfile[]> {
  const snap = await getDocs(collection(db, "practitionerProfiles"));
  return snap.docs.map((d) => ({ ...(d.data() as FSPractitionerProfile) }));
}

export function subscribePractitioners(
  cb: (practitioners: FSPractitionerProfile[]) => void
): () => void {
  return onSnapshot(
    collection(db, "practitionerProfiles"),
    (snap) => cb(snap.docs.map((d) => d.data() as FSPractitionerProfile)),
    () => cb([])
  );
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

export async function rejectCredentialsReview(
  userId: string,
  note?: string
): Promise<void> {
  await updateDoc(doc(db, "practitionerProfiles", userId), {
    credentialReviewNote: note ?? "",
  });
}

// ── Vendor Applications ─────────────────────────────────────────────────────

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
  /** ISO date string — product shows in featured strip until this date. */
  featuredUntil?: string;
  createdAt: string;
}

export function subscribeVendorApplications(
  cb: (applications: FSVendorApplication[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, "vendorApplications"),
      orderBy("submittedAt", "desc")
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as FSVendorApplication)),
    (err) => { console.error("[Admin] vendorApplications error:", err.code, err.message); cb([]); }
  );
}

export async function approveVendorApplication(
  applicationId: string,
  application: FSVendorApplication
): Promise<void> {
  const now = new Date().toISOString();
  // If vendor paid for featured, set featuredUntil to 30 days from now
  const featuredUntil = application.featuredPaid
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  await Promise.all([
    updateDoc(doc(db, "vendorApplications", applicationId), {
      status: "approved",
      reviewedAt: now,
    }),
    setDoc(doc(db, "vendorProfiles", application.userId), {
      userId: application.userId,
      businessName: application.businessName,
      description: application.description,
      categories: application.categories,
      contactEmail: application.contactEmail,
      website: application.website ?? "",
      approved: true,
      productCount: 0,
      createdAt: now,
      tier: application.tier ?? "basic",
      ...(featuredUntil && { featuredUntil }),
    }),
  ]);
}

export async function rejectVendorApplication(
  applicationId: string,
  note?: string
): Promise<void> {
  await updateDoc(doc(db, "vendorApplications", applicationId), {
    status: "rejected",
    rejectionNote: note ?? "",
    reviewedAt: new Date().toISOString(),
  });
}

export function subscribeAllVendorProfiles(
  cb: (profiles: FSVendorProfile[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, "vendorProfiles"), where("approved", "==", true)),
    (snap) => cb(snap.docs.map((d) => d.data() as FSVendorProfile).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    () => cb([])
  );
}

export function subscribeVendorProductsByVendor(
  vendorId: string,
  cb: (products: FSVendorProduct[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, "shopProducts"), where("vendorId", "==", vendorId)),
    (snap) => cb(snap.docs.map((d) => d.data() as FSVendorProduct)),
    () => cb([])
  );
}

export async function setVendorTier(userId: string, tier: "basic" | "verified"): Promise<void> {
  await updateDoc(doc(db, "vendorProfiles", userId), { tier });
}

/** Set or clear the featured window on a vendor profile, and propagate
 *  the same date to all of that vendor's products so they auto-expire too. */
export async function setVendorFeaturedUntil(userId: string, featuredUntil: string | null): Promise<void> {
  await updateDoc(doc(db, "vendorProfiles", userId), {
    featuredUntil: featuredUntil ?? "",
  });
  // Propagate to all of this vendor's products so they also auto-expire
  const productSnap = await getDocs(
    query(collection(db, "shopProducts"), where("vendorId", "==", userId))
  );
  await Promise.all(
    productSnap.docs.map((d) =>
      updateDoc(d.ref, { featuredUntil: featuredUntil ?? "" })
    )
  );
}

/** Feature an individual product for a given number of days, or pass null to remove. */
export async function setVendorProductFeatured(productId: string, days: number | null): Promise<void> {
  const featuredUntil = days
    ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    : "";
  await updateDoc(doc(db, "shopProducts", productId), { featuredUntil });
}
