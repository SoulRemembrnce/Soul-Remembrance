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

export const PRACTITIONERS: Practitioner[] = [
  {
    id: 1,
    name: "Luna Ashford",
    initials: "LA",
    avatarColor: ["#2D1B69", "#7B5EA7"],
    title: "Sound Healer & Reiki Master",
    location: "Sedona, AZ",
    city: "Sedona",
    country: "USA",
    lat: 34.8697,
    lon: -111.7609,
    rating: 4.9,
    reviews: 128,
    tags: ["Sound Bath", "Reiki", "Energy Work"],
    verified: true,
    price: 120,
    bio: "I've been guiding people through sound and energy healing for over 8 years. My sessions weave together crystal singing bowls, Reiki, and intuitive guidance to help you release what no longer serves.",
    modalities: ["Sound Healing", "Reiki"],
    nextAvail: "Today",
    online: true,
  },
  {
    id: 2,
    name: "Marcus Rivera",
    initials: "MR",
    avatarColor: ["#1A4D2E", "#3A8C5C"],
    title: "Somatic Therapist",
    location: "Portland, OR",
    city: "Portland",
    country: "USA",
    lat: 45.5051,
    lon: -122.6750,
    rating: 4.8,
    reviews: 94,
    tags: ["Somatic", "Trauma", "Breathwork"],
    verified: true,
    price: 150,
    bio: "Specialising in trauma-informed somatic therapy and breathwork. I help clients reconnect with their bodies and release stored tension through gentle, evidence-based approaches.",
    modalities: ["Somatic Therapy", "Breathwork"],
    nextAvail: "Tomorrow",
    online: true,
  },
  {
    id: 3,
    name: "Priya Nair",
    initials: "PN",
    avatarColor: ["#6B4FA8", "#9B7FD4"],
    title: "Ayurvedic Practitioner",
    location: "Boulder, CO",
    city: "Boulder",
    country: "USA",
    lat: 40.0150,
    lon: -105.2705,
    rating: 5.0,
    reviews: 67,
    tags: ["Ayurveda", "Meditation", "Herbs"],
    verified: true,
    price: 95,
    bio: "Trained in Kerala, India with 12 years of Ayurvedic practice. I offer personalised consultations, herbal remedies and daily routine guidance to restore your natural balance.",
    modalities: ["Ayurveda", "Meditation"],
    nextAvail: "Thu 5 Jun",
    online: false,
  },
  {
    id: 4,
    name: "Ayla Storm",
    initials: "AS",
    avatarColor: ["#1A0F3D", "#4A2080"],
    title: "Shamanic Healer",
    location: "Glastonbury, UK",
    city: "Glastonbury",
    country: "UK",
    lat: 51.1458,
    lon: -2.7158,
    rating: 4.7,
    reviews: 52,
    tags: ["Shamanic", "Plant Medicine", "Soul Retrieval"],
    verified: true,
    price: 110,
    bio: "Working with ancestral and earth-based healing traditions for 15 years. My sessions offer deep soul retrieval, energy clearing and connection to your higher guidance.",
    modalities: ["Shamanic Healing", "Plant Medicine"],
    nextAvail: "Fri 6 Jun",
    online: true,
  },
  {
    id: 5,
    name: "James Chen",
    initials: "JC",
    avatarColor: ["#0D3B6E", "#1A6EAD"],
    title: "Meditation & EFT Coach",
    location: "London, UK",
    city: "London",
    country: "UK",
    lat: 51.5074,
    lon: -0.1278,
    rating: 4.9,
    reviews: 201,
    tags: ["Meditation", "EFT", "Mindfulness"],
    verified: true,
    price: 80,
    bio: "Helping people find stillness and emotional freedom through meditation and EFT tapping. Over 500 sessions delivered online worldwide.",
    modalities: ["Meditation", "EFT / Tapping"],
    nextAvail: "Today",
    online: true,
  },
  {
    id: 6,
    name: "Rosa Bloom",
    initials: "RB",
    avatarColor: ["#6B1F6B", "#A855A8"],
    title: "Crystal & Energy Healer",
    location: "Brighton, UK",
    city: "Brighton",
    country: "UK",
    lat: 50.8225,
    lon: -0.1372,
    rating: 4.6,
    reviews: 38,
    tags: ["Crystal Healing", "Reiki", "Chakra"],
    verified: false,
    price: 70,
    bio: "Intuitive crystal healer combining reiki, chakra balancing and crystal grids to support your energetic wellbeing and spiritual growth.",
    modalities: ["Crystal Healing", "Reiki"],
    nextAvail: "Sat 7 Jun",
    online: true,
  },
];

export const EVENTS: SREvent[] = [
  {
    id: 1,
    title: "Full Moon Sound Bath",
    host: "Luna Ashford",
    hostInitials: "LA",
    date: "Jun 1",
    dateISO: "2026-06-01",
    time: "7:00 PM",
    location: "Sedona Crystal Center",
    type: "In-Person",
    spots: 3,
    total: 20,
    price: "£45",
    tag: "Sound Healing",
    color: ["#6B4FA8", "#3D2496"],
  },
  {
    id: 2,
    title: "Breathwork & Release",
    host: "Marcus Rivera",
    hostInitials: "MR",
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
    host: "Priya Nair",
    hostInitials: "PN",
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
    host: "Sacred Roots Collective",
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

export const POSTS: Post[] = [
  {
    id: 1,
    author: "Luna Ashford",
    initials: "LA",
    role: "practitioner",
    circle: "Sound Healing",
    time: "2m ago",
    text: "Just finished a beautiful full moon sound bath with 12 souls tonight. The energy in the room was absolutely electric. If you missed it, I have space for two more on Thursday evening. Message me if you feel called.",
    likes: 34,
    liked: false,
    comments: [
      { id: 1, author: "Amara J.", initials: "AJ", text: "This sounds incredible Luna! Booking Thursday now", time: "1m ago" },
      { id: 2, author: "Sarah M.", initials: "SM", text: "I was there last month and it genuinely changed something in me. Highly recommend.", time: "just now" },
    ],
  },
  {
    id: 2,
    author: "Priya Nair",
    initials: "PN",
    role: "practitioner",
    circle: "Ayurveda",
    time: "1h ago",
    text: "A little reminder for this season. In Ayurveda, late spring is Kapha season — the time to shed, release and invite lightness. Favour warm spiced foods, movement and dry brushing. What rituals are you leaning into right now?",
    likes: 28,
    liked: false,
    comments: [
      { id: 1, author: "James O.", initials: "JO", text: "Started a morning walk practice this week and it honestly feels like the best decision I've made all year", time: "45m ago" },
    ],
  },
  {
    id: 3,
    author: "Zara K.",
    initials: "ZK",
    role: "client",
    circle: "Healing Journey",
    time: "3h ago",
    text: "Six months ago I didn't even know what a sound bath was. Today I completed my 10th Reiki session and I genuinely feel like a different person. Lighter. More myself. Thank you to this community for the recommendations — you changed my life.",
    likes: 67,
    liked: false,
    comments: [
      { id: 1, author: "Marcus R.", initials: "MR", text: "This is beautiful Zara. Keep going — you're doing the work", time: "2h ago" },
      { id: 2, author: "Ayla Storm", initials: "AS", text: "Your transformation is visible even through your words. So proud of you.", time: "1h ago" },
    ],
  },
  {
    id: 4,
    author: "Marcus Rivera",
    initials: "MR",
    role: "practitioner",
    circle: "Breathwork",
    time: "5h ago",
    text: "Reminder: breathing is medicine. 4-7-8 breathing before bed tonight — inhale for 4, hold for 7, exhale for 8. Do this 4 times. You will sleep better than you have in weeks. Let me know how it goes.",
    likes: 89,
    liked: false,
    comments: [],
  },
  {
    id: 5,
    author: "Tom B.",
    initials: "TB",
    role: "client",
    circle: "Healing Journey",
    time: "8h ago",
    text: "Question for the community — I'm struggling to choose between starting with Reiki or Sound Healing. Has anyone done both? Which would you recommend for someone new to energy work dealing with stress and anxiety?",
    likes: 14,
    liked: false,
    comments: [
      { id: 1, author: "Luna Ashford", initials: "LA", text: "Sound Healing is incredibly accessible for beginners. You simply lie down and receive. Just let the vibrations do the work.", time: "7h ago" },
      { id: 2, author: "Priya Nair", initials: "PN", text: "I'd say start with whichever practitioner you feel most drawn to — the connection matters more than the modality", time: "6h ago" },
    ],
  },
];

export const THREADS: Thread[] = [
  {
    id: 1,
    from: "Luna Ashford",
    initials: "LA",
    avatarColor: ["#2D1B69", "#7B5EA7"],
    preview: "So glad you joined our circle! See you at the Full Moon Sound Bath",
    time: "2m",
    unread: 2,
    practitionerId: 1,
  },
  {
    id: 2,
    from: "Desert Retreat Group",
    initials: "DR",
    avatarColor: ["#6B4FA8", "#9B7FD4"],
    preview: "Marcus: Don't forget your journal this weekend",
    time: "1h",
    unread: 5,
  },
  {
    id: 3,
    from: "Priya Nair",
    initials: "PN",
    avatarColor: ["#6B4FA8", "#9B7FD4"],
    preview: "Your intake form has been received. See you Thursday!",
    time: "3h",
    unread: 0,
    practitionerId: 3,
  },
  {
    id: 4,
    from: "Breathwork Community",
    initials: "BC",
    avatarColor: ["#1A4D2E", "#3A8C5C"],
    preview: "New event posted: Evening Pranayama Series",
    time: "1d",
    unread: 1,
  },
];

export const CHAT_MESSAGES: Record<number, ChatMessage[]> = {
  1: [
    { id: 1, text: "Hello! I'm so excited to have you in our community.", from: "them", time: "Mon 10:00" },
    { id: 2, text: "Thank you! I've been looking for something like this for a while.", from: "me", time: "Mon 10:02" },
    { id: 3, text: "I have space in Thursday's sound bath if you'd like to join. It's a small group of 8.", from: "them", time: "Mon 10:05" },
    { id: 4, text: "That sounds wonderful! How do I book?", from: "me", time: "Mon 10:08" },
    { id: 5, text: "You can book directly through the app — just head to my profile and tap 'Book Session'.", from: "them", time: "Mon 10:09" },
    { id: 6, text: "So glad you joined our circle! See you at the Full Moon Sound Bath", from: "them", time: "2m ago" },
  ],
  3: [
    { id: 1, text: "Hi! I received your inquiry about Ayurvedic consultations.", from: "them", time: "Yesterday 14:00" },
    { id: 2, text: "Yes, I've been struggling with energy and digestion. A friend recommended Ayurveda.", from: "me", time: "Yesterday 14:10" },
    { id: 3, text: "I'd love to help. Could you fill in the intake form I just sent you?", from: "them", time: "Yesterday 14:12" },
    { id: 4, text: "Done! Just submitted it.", from: "me", time: "Yesterday 15:00" },
    { id: 5, text: "Your intake form has been received. See you Thursday!", from: "them", time: "3h ago" },
  ],
};

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

export const BOOKING_DATES = ["Today", "Thu 5 Jun", "Fri 6 Jun", "Sat 7 Jun", "Sun 8 Jun", "Mon 9 Jun"];
export const BOOKING_TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

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

export const REVIEWS: Record<number, Review[]> = {
  1: [
    {
      id: "r1-1", practitionerId: 1,
      authorName: "Sarah K.", authorInitials: "SK",
      avatarColor: ["#6B4FA8", "#9B7FD4"],
      rating: 5,
      text: "Luna's sound bath completely shifted my energy. The crystal bowls resonated in my bones and I left feeling lighter than I had in years. Already booked my next session.",
      date: "29 May 2026", verified: true,
    },
    {
      id: "r1-2", practitionerId: 1,
      authorName: "Oliver P.", authorInitials: "OP",
      avatarColor: ["#1A4D2E", "#3A8C5C"],
      rating: 5,
      text: "My first Reiki session with Luna was transformative. She has an incredible gift for sensing where energy is blocked. Walked out feeling genuinely realigned.",
      date: "18 May 2026", verified: true,
    },
    {
      id: "r1-3", practitionerId: 1,
      authorName: "Mia C.", authorInitials: "MC",
      avatarColor: ["#0D3B6E", "#1A6EAD"],
      rating: 4,
      text: "Beautifully held session. Luna created a safe, sacred space and her intuition is remarkable. One of the most peaceful experiences I've had in a long time.",
      date: "3 May 2026", verified: false,
    },
  ],
  2: [
    {
      id: "r2-1", practitionerId: 2,
      authorName: "Jake R.", authorInitials: "JR",
      avatarColor: ["#2D1B69", "#7B5EA7"],
      rating: 5,
      text: "Marcus helped me understand how trauma lives in the body in a way no talk therapist ever did. His breathwork session unlocked something deep I'd been holding for years.",
      date: "25 May 2026", verified: true,
    },
    {
      id: "r2-2", practitionerId: 2,
      authorName: "Priti S.", authorInitials: "PS",
      avatarColor: ["#6B1F6B", "#A855A8"],
      rating: 5,
      text: "Incredibly skilled and compassionate. The somatic work was gentle but powerful. I felt completely held throughout. Marcus is a rare find.",
      date: "14 May 2026", verified: true,
    },
    {
      id: "r2-3", practitionerId: 2,
      authorName: "Dan W.", authorInitials: "DW",
      avatarColor: ["#1A0F3D", "#4A2080"],
      rating: 4,
      text: "Thoughtful, professional, and genuinely caring. The breathwork techniques Marcus taught me have become part of my daily practice. Highly recommend.",
      date: "28 Apr 2026", verified: false,
    },
  ],
  3: [
    {
      id: "r3-1", practitionerId: 3,
      authorName: "Rachel M.", authorInitials: "RM",
      avatarColor: ["#7C3D3D", "#C06060"],
      rating: 5,
      text: "Priya's Ayurvedic consultation was the most thorough health conversation I've ever had. The herbal protocol she designed has transformed my digestion and sleep quality.",
      date: "27 May 2026", verified: true,
    },
    {
      id: "r3-2", practitionerId: 3,
      authorName: "Tom B.", authorInitials: "TB",
      avatarColor: ["#1A4D2E", "#3A8C5C"],
      rating: 5,
      text: "I've tried Ayurveda before but never with someone as knowledgeable as Priya. She made everything feel accessible and practical rather than overwhelming.",
      date: "10 May 2026", verified: true,
    },
    {
      id: "r3-3", practitionerId: 3,
      authorName: "Lisa J.", authorInitials: "LJ",
      avatarColor: ["#6B4FA8", "#9B7FD4"],
      rating: 5,
      text: "Three months on and I'm still following Priya's recommendations. My energy, mood and focus have stabilised completely. Absolutely life-changing consultation.",
      date: "21 Apr 2026", verified: true,
    },
  ],
  4: [
    {
      id: "r4-1", practitionerId: 4,
      authorName: "Emma S.", authorInitials: "ES",
      avatarColor: ["#2D1B69", "#7B5EA7"],
      rating: 5,
      text: "Ayla's soul retrieval work was the most profound healing I've ever experienced. I feel more whole and grounded than I have in years. A true gift to the world.",
      date: "26 May 2026", verified: true,
    },
    {
      id: "r4-2", practitionerId: 4,
      authorName: "Ben T.", authorInitials: "BT",
      avatarColor: ["#0D3B6E", "#1A6EAD"],
      rating: 5,
      text: "Ayla holds space beautifully for deep shamanic work. Her connection to earth and ancestral lineages is palpable and deeply respectful. An exceptional healer.",
      date: "15 May 2026", verified: true,
    },
    {
      id: "r4-3", practitionerId: 4,
      authorName: "Claire W.", authorInitials: "CW",
      avatarColor: ["#6B1F6B", "#A855A8"],
      rating: 4,
      text: "The energy clearing session with Ayla shifted something that had been stuck for years. Powerful, gentle, and completely safe. I left feeling profoundly lighter.",
      date: "4 May 2026", verified: false,
    },
  ],
  5: [
    {
      id: "r5-1", practitionerId: 5,
      authorName: "Anna K.", authorInitials: "AK",
      avatarColor: ["#7C3D3D", "#C06060"],
      rating: 5,
      text: "James' EFT sessions have genuinely reduced my anxiety. He's patient, insightful, and knows exactly which points to work on. I use the techniques independently every day now.",
      date: "30 May 2026", verified: true,
    },
    {
      id: "r5-2", practitionerId: 5,
      authorName: "Patrick M.", authorInitials: "PM",
      avatarColor: ["#1A4D2E", "#3A8C5C"],
      rating: 5,
      text: "I was sceptical about EFT but James made it feel completely natural. Within two sessions I was using it on my own. He's an exceptional teacher with a calming presence.",
      date: "20 May 2026", verified: true,
    },
    {
      id: "r5-3", practitionerId: 5,
      authorName: "Sophie H.", authorInitials: "SH",
      avatarColor: ["#1A0F3D", "#4A2080"],
      rating: 5,
      text: "James' guided meditations are beautiful and the EFT work feels like practical magic. My relationship with stress has completely changed since working with him.",
      date: "8 May 2026", verified: false,
    },
  ],
  6: [
    {
      id: "r6-1", practitionerId: 6,
      authorName: "Jade P.", authorInitials: "JP",
      avatarColor: ["#6B4FA8", "#9B7FD4"],
      rating: 5,
      text: "Rosa's crystal healing session was stunning — both the visual beauty of the layout and the energetic shift I felt afterwards. She has a truly intuitive gift.",
      date: "28 May 2026", verified: true,
    },
    {
      id: "r6-2", practitionerId: 6,
      authorName: "Natalie K.", authorInitials: "NK",
      avatarColor: ["#2D1B69", "#7B5EA7"],
      rating: 4,
      text: "Gentle, warm, and deeply intuitive. Rosa's chakra balancing session left me feeling completely aligned. Her explanation of each crystal's purpose was fascinating.",
      date: "16 May 2026", verified: true,
    },
    {
      id: "r6-3", practitionerId: 6,
      authorName: "Alice B.", authorInitials: "AB",
      avatarColor: ["#0D3B6E", "#1A6EAD"],
      rating: 5,
      text: "Rosa helped me choose my first crystal collection and explained the purpose of each one beautifully. Now I feel supported and grounded in my home and at work.",
      date: "2 May 2026", verified: false,
    },
  ],
};
