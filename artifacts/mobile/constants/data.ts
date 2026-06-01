export interface Practitioner {
  id: number;
  name: string;
  initials: string;
  avatarColor: string[];
  title: string;
  location: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  rating: number;
  reviews: number;
  tags: string[];
  verified: boolean;
  price: number;
  bio: string;
  modalities: string[];
  nextAvail: string;
  online: boolean;
  photoURL?: string;
}

export interface SREvent {
  id: number;
  title: string;
  host: string;
  hostInitials: string;
  date: string;
  dateISO: string;
  time: string;
  location: string;
  type: string;
  spots: number;
  total: number;
  price: string;
  tag: string;
  color: string[];
}

export interface Post {
  id: number;
  author: string;
  initials: string;
  role: "practitioner" | "client";
  circle: string;
  time: string;
  text: string;
  likes: number;
  liked: boolean;
  comments: { id: number; author: string; initials: string; text: string; time: string }[];
}

export interface Thread {
  id: number;
  from: string;
  initials: string;
  avatarColor: string[];
  preview: string;
  time: string;
  unread: number;
  practitionerId?: number;
}

export interface ChatMessage {
  id: number;
  text: string;
  from: "me" | "them";
  time: string;
}

export interface Review {
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

// ─── Community events (seeded to Firestore on first run) ──────────────────────

export const EVENTS: SREvent[] = [];

// ─── UI config — not sample data ──────────────────────────────────────────────

export const MODALITIES = [
  "Sound Healing", "Reiki", "Somatic Therapy", "Breathwork",
  "Ayurveda", "Meditation", "Plant Medicine", "Yoga",
  "Hypnotherapy", "EFT / Tapping", "Crystal Healing", "Shamanic Healing",
];

export const FILTER_MODALITIES = [
  "All", "Sound Healing", "Reiki", "Somatic", "Breathwork",
  "Ayurveda", "Meditation", "Shamanic", "EFT", "Crystal",
];

export const CIRCLES = [
  { id: "all", label: "All" },
  { id: "healing", label: "Healing Journey" },
  { id: "sound", label: "Sound Healing" },
  { id: "breathwork", label: "Breathwork" },
  { id: "ayurveda", label: "Ayurveda" },
  { id: "reiki", label: "Reiki" },
  { id: "meditation", label: "Meditation" },
  { id: "events", label: "Events" },
];
