import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { Review } from "@/constants/data";
import { auth } from "@/lib/firebase";
import {
  addBookingToFirestore,
  addFavoriteToFirestore,
  addReviewToFirestore,
  FSBooking,
  removeFavoriteFromFirestore,
  subscribeBookings,
  subscribeFavorites,
} from "@/lib/firestore";
import { seedDatabaseIfEmpty } from "@/lib/seed";
import { requestNotificationPermission } from "@/utils/notifications";

interface Booking {
  id: string;
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
}

interface AppContextValue {
  userId: string | null;
  favorites: Set<number>;
  toggleFavorite: (id: number) => void;
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  goingEvents: Set<number>;
  toggleGoingEvent: (id: number) => void;
  userName: string;
  notificationsGranted: boolean;
  userReviews: Review[];
  addReview: (review: Review) => void;
  dbReady: boolean;
}

const AppContext = createContext<AppContextValue>({
  userId: null,
  favorites: new Set(),
  toggleFavorite: () => {},
  bookings: [],
  addBooking: () => {},
  goingEvents: new Set(),
  toggleGoingEvent: () => {},
  userName: "Amara",
  notificationsGranted: false,
  userReviews: [],
  addReview: () => {},
  dbReady: false,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [goingEvents, setGoingEvents] = useState<Set<number>>(new Set());
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [dbReady, setDbReady] = useState(false);

  const dataUnsubsRef = useRef<Array<() => void>>([]);

  // ── Step 1: Seed database on first app launch ──────────────────────────
  useEffect(() => {
    seedDatabaseIfEmpty()
      .then(() => setDbReady(true))
      .catch((e) => {
        console.warn("[AppContext] Seed failed:", e);
        setDbReady(true); // still mark ready so app doesn't hang
      });

    requestNotificationPermission().then(setNotificationsGranted);
  }, []);

  // ── Step 2: Auth — sign in anonymously if not already signed in ─────────
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          setUser(cred.user);
        } catch (e) {
          console.warn("[AppContext] Anonymous sign-in failed:", e);
        }
      }
    });
    return unsubAuth;
  }, []);

  // ── Step 3: Subscribe to user data once we have a UID ──────────────────
  useEffect(() => {
    if (!user) return;

    // Tear down any previous subscriptions before starting new ones
    dataUnsubsRef.current.forEach((u) => u());
    dataUnsubsRef.current = [];

    dataUnsubsRef.current.push(
      subscribeBookings(user.uid, (bs) => {
        setBookings(
          bs.map((b) => ({
            id: b.id,
            practitionerId: b.practitionerId,
            practitionerName: b.practitionerName,
            practitionerInitials: b.practitionerInitials,
            avatarColor: b.avatarColor,
            date: b.date,
            time: b.time,
            price: b.price,
            online: b.online,
            location: b.location,
            confirmedAt: b.confirmedAt,
          }))
        );
      })
    );

    dataUnsubsRef.current.push(
      subscribeFavorites(user.uid, (ids) => {
        setFavorites(new Set(ids));
      })
    );

    return () => {
      dataUnsubsRef.current.forEach((u) => u());
      dataUnsubsRef.current = [];
    };
  }, [user?.uid]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const toggleFavorite = useCallback(
    (id: number) => {
      if (!user) return;
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          removeFavoriteFromFirestore(user.uid, id).catch(console.warn);
        } else {
          next.add(id);
          addFavoriteToFirestore(user.uid, id).catch(console.warn);
        }
        return next;
      });
    },
    [user]
  );

  const addBooking = useCallback(
    (booking: Booking) => {
      if (!user) return;
      setBookings((prev) => [booking, ...prev]);
      addBookingToFirestore(user.uid, booking).catch(console.warn);
    },
    [user]
  );

  const toggleGoingEvent = useCallback((id: number) => {
    setGoingEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addReview = useCallback((review: Review) => {
    setUserReviews((prev) => [review, ...prev]);
    addReviewToFirestore(review).catch(console.warn);
  }, []);

  return (
    <AppContext.Provider
      value={{
        userId: user?.uid ?? null,
        favorites,
        toggleFavorite,
        bookings,
        addBooking,
        goingEvents,
        toggleGoingEvent,
        userName: "Amara",
        notificationsGranted,
        userReviews,
        addReview,
        dbReady,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
