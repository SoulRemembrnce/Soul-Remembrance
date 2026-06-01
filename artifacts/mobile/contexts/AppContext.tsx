import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { Review } from "@/constants/data";
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
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [goingEvents, setGoingEvents] = useState<Set<number>>(new Set());
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [dbReady, setDbReady] = useState(false);

  // ── Bootstrap: seed + subscribe ───────────────────────────────────────────
  useEffect(() => {
    let unsubs: Array<() => void> = [];

    (async () => {
      // Seed Firestore collections if empty (runs once, no-ops after)
      await seedDatabaseIfEmpty();
      setDbReady(true);

      // Subscribe to bookings live
      unsubs.push(
        subscribeBookings((bs) => {
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

      // Subscribe to favorites live
      unsubs.push(
        subscribeFavorites((ids) => {
          setFavorites(new Set(ids));
        })
      );

      // Notification permission
      const granted = await requestNotificationPermission();
      setNotificationsGranted(granted);
    })();

    return () => unsubs.forEach((u) => u());
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        removeFavoriteFromFirestore(id).catch(console.warn);
      } else {
        next.add(id);
        addFavoriteToFirestore(id).catch(console.warn);
      }
      return next;
    });
  }, []);

  const addBooking = useCallback((booking: Booking) => {
    // Optimistic local update — Firestore subscription will confirm
    setBookings((prev) => [booking, ...prev]);
    addBookingToFirestore(booking).catch(console.warn);
  }, []);

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
