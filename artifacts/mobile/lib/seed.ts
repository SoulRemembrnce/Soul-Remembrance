import { EVENTS, PRACTITIONERS, REVIEWS } from "@/constants/data";
import {
  FSAvailabilitySlot,
  FSEvent,
  FSPractitioner,
  FSReview,
  seedAvailability,
  seedEvents,
  seedPractitioners,
  seedReviews,
} from "./firestore";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateLabel(d: Date, index: number): string {
  if (index === 0) return "Today";
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function dateISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ─── Practitioner time profiles ───────────────────────────────────────────────

interface TimeSlot { time: string; timeISO: string }

const PRACTITIONER_TIMES: Record<number, TimeSlot[]> = {
  1: [ // Luna Ashford — mornings & evenings
    { time: "9:00 AM",  timeISO: "09:00" },
    { time: "10:00 AM", timeISO: "10:00" },
    { time: "11:00 AM", timeISO: "11:00" },
    { time: "6:00 PM",  timeISO: "18:00" },
    { time: "7:00 PM",  timeISO: "19:00" },
  ],
  2: [ // Marcus Rivera — afternoons & evenings
    { time: "1:00 PM",  timeISO: "13:00" },
    { time: "2:00 PM",  timeISO: "14:00" },
    { time: "3:00 PM",  timeISO: "15:00" },
    { time: "5:00 PM",  timeISO: "17:00" },
    { time: "6:00 PM",  timeISO: "18:00" },
  ],
  3: [ // Priya Nair — early mornings
    { time: "7:00 AM",  timeISO: "07:00" },
    { time: "8:00 AM",  timeISO: "08:00" },
    { time: "9:00 AM",  timeISO: "09:00" },
    { time: "10:00 AM", timeISO: "10:00" },
  ],
  4: [ // David Chen — all day
    { time: "9:00 AM",  timeISO: "09:00" },
    { time: "11:00 AM", timeISO: "11:00" },
    { time: "1:00 PM",  timeISO: "13:00" },
    { time: "3:00 PM",  timeISO: "15:00" },
    { time: "5:00 PM",  timeISO: "17:00" },
  ],
  5: [ // Zara Ahmed — afternoons & evenings
    { time: "12:00 PM", timeISO: "12:00" },
    { time: "2:00 PM",  timeISO: "14:00" },
    { time: "4:00 PM",  timeISO: "16:00" },
    { time: "6:30 PM",  timeISO: "18:30" },
    { time: "8:00 PM",  timeISO: "20:00" },
  ],
  6: [ // Ravi Patel — mornings & midday
    { time: "6:30 AM",  timeISO: "06:30" },
    { time: "8:00 AM",  timeISO: "08:00" },
    { time: "9:30 AM",  timeISO: "09:30" },
    { time: "11:00 AM", timeISO: "11:00" },
    { time: "12:00 PM", timeISO: "12:00" },
  ],
};

// ─── Slot generator ───────────────────────────────────────────────────────────

function generateAvailabilitySlots(): FSAvailabilitySlot[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const slots: FSAvailabilitySlot[] = [];

  for (const practitioner of PRACTITIONERS) {
    const times = PRACTITIONER_TIMES[practitioner.id] ?? PRACTITIONER_TIMES[1];

    for (let dayOffset = 0; dayOffset < 21; dayOffset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + dayOffset);

      const dow = d.getDay(); // 0=Sun, 6=Sat
      // Practitioners work fewer days — skip ~30% weekdays, always open weekends
      const isWeekend = dow === 0 || dow === 6;
      // Deterministic skip: use practitionerId + dayOffset as seed
      const skip = !isWeekend && ((practitioner.id * 7 + dayOffset) % 10 < 3);
      if (skip) continue;

      // On weekends, only offer a subset of times
      const availTimes = isWeekend
        ? times.slice(0, Math.ceil(times.length / 2))
        : times;

      const label = dateLabel(d, dayOffset);
      const iso   = dateISO(d);

      for (const ts of availTimes) {
        const timeSlug = ts.timeISO.replace(":", "-");
        const id = `${practitioner.id}_${iso}_${timeSlug}`;
        // Pre-book ~15% of slots to simulate existing demand
        const preBooked = ((practitioner.id * 31 + dayOffset * 13 + availTimes.indexOf(ts) * 7) % 100) < 15;
        slots.push({
          id,
          practitionerId: practitioner.id,
          date: label,
          dateISO: iso,
          time: ts.time,
          timeISO: ts.timeISO,
          booked: preBooked,
        });
      }
    }
  }

  return slots;
}

// ─── Main seed entry point ────────────────────────────────────────────────────

export async function seedDatabaseIfEmpty(): Promise<void> {
  try {
    const slots = generateAvailabilitySlots();
    await Promise.all([
      seedPractitioners(PRACTITIONERS as unknown as FSPractitioner[]),
      seedEvents(EVENTS as unknown as FSEvent[]),
      seedReviews(REVIEWS as unknown as Record<number, FSReview[]>),
      seedAvailability(slots),
    ]);
    console.log("[Seed] Firestore seeding complete");
  } catch (e) {
    console.warn("[Seed] Seeding skipped or failed:", e);
  }
}
