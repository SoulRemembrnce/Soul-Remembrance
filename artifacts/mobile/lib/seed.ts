import { EVENTS, PRACTITIONERS, REVIEWS } from "@/constants/data";
import { FSEvent, FSPractitioner, FSReview, seedEvents, seedPractitioners, seedReviews } from "./firestore";

export async function seedDatabaseIfEmpty(): Promise<void> {
  try {
    await Promise.all([
      seedPractitioners(PRACTITIONERS as unknown as FSPractitioner[]),
      seedEvents(EVENTS as unknown as FSEvent[]),
      seedReviews(REVIEWS as unknown as Record<number, FSReview[]>),
    ]);
    console.log("[Seed] Firestore seeding complete");
  } catch (e) {
    console.warn("[Seed] Seeding skipped or failed:", e);
  }
}
