import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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

WebBrowser.maybeCompleteAuthSession();

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
  isAnonymous: boolean;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
  favorites: Set<number>;
  toggleFavorite: (id: number) => void;
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  goingEvents: Set<number>;
  toggleGoingEvent: (id: number) => void;
  notificationsGranted: boolean;
  userReviews: Review[];
  addReview: (review: Review) => void;
  dbReady: boolean;
}

const AppContext = createContext<AppContextValue>({
  userId: null,
  isAnonymous: true,
  displayName: null,
  email: null,
  photoURL: null,
  signInWithGoogle: () => {},
  signOut: async () => {},
  favorites: new Set(),
  toggleFavorite: () => {},
  bookings: [],
  addBooking: () => {},
  goingEvents: new Set(),
  toggleGoingEvent: () => {},
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

  // ── Google OAuth request ───────────────────────────────────────────────────
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "not-configured";
  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: googleClientId,
  });

  // Process Google auth response
  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params.id_token;
    if (!idToken) return;

    const credential = GoogleAuthProvider.credential(idToken);
    const currentUser = auth.currentUser;

    if (currentUser?.isAnonymous) {
      // Upgrade anonymous → Google account (keeps their bookings/favorites)
      linkWithCredential(currentUser, credential).catch(() =>
        signInWithCredential(auth, credential)
      );
    } else {
      signInWithCredential(auth, credential).catch(console.warn);
    }
  }, [response]);

  // ── Step 1: Seed DB on first launch ───────────────────────────────────────
  useEffect(() => {
    seedDatabaseIfEmpty()
      .then(() => setDbReady(true))
      .catch(() => setDbReady(true));
    requestNotificationPermission().then(setNotificationsGranted);
  }, []);

  // ── Step 2: Firebase Auth listener ────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
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
    return unsub;
  }, []);

  // ── Step 3: Subscribe to user data when UID is available ──────────────────
  useEffect(() => {
    if (!user) return;

    dataUnsubsRef.current.forEach((u) => u());
    dataUnsubsRef.current = [];

    dataUnsubsRef.current.push(
      subscribeBookings(user.uid, (bs) =>
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
        )
      )
    );

    dataUnsubsRef.current.push(
      subscribeFavorites(user.uid, (ids) => setFavorites(new Set(ids)))
    );

    return () => {
      dataUnsubsRef.current.forEach((u) => u());
      dataUnsubsRef.current = [];
    };
  }, [user?.uid]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(() => {
    promptAsync();
  }, [promptAsync]);

  const signOut = useCallback(async () => {
    dataUnsubsRef.current.forEach((u) => u());
    dataUnsubsRef.current = [];
    setBookings([]);
    setFavorites(new Set());
    await firebaseSignOut(auth);
    // onAuthStateChanged will trigger anonymous sign-in automatically
  }, []);

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
        isAnonymous: user?.isAnonymous ?? true,
        displayName: user?.displayName ?? null,
        email: user?.email ?? null,
        photoURL: user?.photoURL ?? null,
        signInWithGoogle,
        signOut,
        favorites,
        toggleFavorite,
        bookings,
        addBooking,
        goingEvents,
        toggleGoingEvent,
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
