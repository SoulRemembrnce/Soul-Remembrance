import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { Review } from "@/constants/data";
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
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [goingEvents, setGoingEvents] = useState<Set<number>>(new Set());
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [userReviews, setUserReviews] = useState<Review[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [favStr, bookStr, evStr, reviewStr] = await Promise.all([
          AsyncStorage.getItem("sr_favorites"),
          AsyncStorage.getItem("sr_bookings"),
          AsyncStorage.getItem("sr_going_events"),
          AsyncStorage.getItem("sr_user_reviews"),
        ]);
        if (favStr) setFavorites(new Set(JSON.parse(favStr)));
        if (bookStr) setBookings(JSON.parse(bookStr));
        if (evStr) setGoingEvents(new Set(JSON.parse(evStr)));
        if (reviewStr) setUserReviews(JSON.parse(reviewStr));
      } catch {}

      const granted = await requestNotificationPermission();
      setNotificationsGranted(granted);
    })();
  }, []);

  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      AsyncStorage.setItem("sr_favorites", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const addBooking = useCallback((booking: Booking) => {
    setBookings((prev) => {
      const next = [booking, ...prev];
      AsyncStorage.setItem("sr_bookings", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleGoingEvent = useCallback((id: number) => {
    setGoingEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      AsyncStorage.setItem("sr_going_events", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const addReview = useCallback((review: Review) => {
    setUserReviews((prev) => {
      const next = [review, ...prev];
      AsyncStorage.setItem("sr_user_reviews", JSON.stringify(next));
      return next;
    });
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
