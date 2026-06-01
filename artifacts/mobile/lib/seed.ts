import { EVENTS } from "@/constants/data";
import { FSEvent, seedEvents } from "./firestore";

// ─── Main seed entry point ────────────────────────────────────────────────────
// Only seeds community events — practitioners are real accounts, not seeded data.

export async function seedDatabaseIfEmpty(): Promise<void> {
  try {
    await seedEvents(EVENTS as unknown as FSEvent[]);
    console.log("[Seed] Firestore seeding complete");
  } catch (e) {
    console.warn("[Seed] Seeding skipped or failed:", e);
  }
}
