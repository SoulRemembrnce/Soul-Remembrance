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

export const EVENTS: SREvent[] = [
  {
    id: 1,
    title: "Full Moon Sound Bath",
    host: "Soul Remembrance",
    hostInitials: "SR",
    date: "Jun 1",
    dateISO: "2026-06-01",
    time: "7:00 PM",
    location: "Online",
    type: "Virtual",
    spots: 3,
    total: 20,
    price: "£45",
    tag: "Sound Healing",
    color: ["#6B4FA8", "#3D2496"],
  },
  {
    id: 2,
    title: "Breathwork & Release",
    host: "Soul Remembrance",
    hostInitials: "SR",
    date: "Jun 3",
    dateISO: "2026-06-03",
    time: "10:00 AM",
    location: "Online via Zoom",
    type: "Virtual",
    spots: 12,
    total: 30,
    price: "£35",
    tag: "Breathwork",
    color: ["#1A4D2E", "#2D7A4A"],
  },
  {
    id: 3,
    title: "7-Day Desert Retreat",
    host: "Soul Remembrance",
    hostInitials: "SR",
    date: "Jun 5–11",
    dateISO: "2026-06-05",
    time: "All Day",
    location: "Taos, New Mexico",
    type: "Retreat",
    spots: 4,
    total: 12,
    price: "£1,200",
    tag: "Retreat",
    color: ["#2D1B69", "#6B4FA8"],
  },
  {
    id: 4,
    title: "Intro to Plant Medicine",
    host: "Soul Remembrance",
    hostInitials: "SR",
    date: "Jun 7",
    dateISO: "2026-06-07",
    time: "2:00 PM",
    location: "Online",
    type: "Workshop",
    spots: 18,
    total: 40,
    price: "Free",
    tag: "Workshop",
    color: ["#7A4A00", "#C9A84C"],
  },
];

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
