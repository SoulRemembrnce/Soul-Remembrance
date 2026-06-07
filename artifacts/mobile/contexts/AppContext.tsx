import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/build/providers/Google";
import * as WebBrowser from "expo-web-browser";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  deleteUser,
  signOut as firebaseSignOut,
  updateProfile,
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

const REMEMBER_ME_KEY = "@sr:rememberMe";

import { Review } from "@/constants/data";
import { auth } from "@/lib/firebase";
import {
  addBookingToFirestore,
  addFavoriteToFirestore,
  addFollowingToFirestore,
  addReviewToFirestore,
  FSBooking,
  FSUserProfile,
  removeFavoriteFromFirestore,
  removeFollowingFromFirestore,
  subscribeBookings,
  subscribeFavorites,
  subscribeFollowing,
  subscribeUserProfile,
} from "@/lib/firestore";
import { seedDatabaseIfEmpty } from "@/lib/seed";
import {
  requestNotificationPermission,
  registerPushToken,
} from "@/utils/notifications";
import { savePushToken } from "@/lib/firestore";

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
  videoLink?: string;
  serviceName?: string;
  serviceDuration?: number;
}

interface AppContextValue {
  userId: string | null;
  isAnonymous: boolean;
  displayName: string | null;
  userName: string;
  email: string | null;
  photoURL: string | null;
  signInWithGoogle: () => void;
  signInWithEmail: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updatePhotoURL: (url: string) => Promise<void>;
  favorites: Set<number>;
  toggleFavorite: (id: number) => void;
  following: Set<number>;
  toggleFollowing: (id: number) => void;
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  goingEvents: Set<number>;
  toggleGoingEvent: (id: number) => void;
  notificationsGranted: boolean;
  userReviews: Review[];
  addReview: (review: Review) => void;
  dbReady: boolean;
  retreatsAttended: number;
}

const AppContext = createContext<AppContextValue>({
  userId: null,
  isAnonymous: true,
  displayName: null,
  userName: "Friend",
  email: null,
  photoURL: null,
  signInWithGoogle: () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  sendPasswordReset: async () => {},
  signOut: async () => {},
  deleteAccount: async () => {},
  updatePhotoURL: async () => {},
  favorites: new Set(),
  toggleFavorite: () => {},
  following: new Set(),
  toggleFollowing: () => {},
  bookings: [],
  addBooking: () => {},
  goingEvents: new Set(),
  toggleGoingEvent: () => {},
  notificationsGranted: false,
  userReviews: [],
  addReview: () => {},
  dbReady: false,
  retreatsAttended: 0,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [following, setFollowing] = useState<Set<number>>(new Set());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [goingEvents, setGoingEvents] = useState<Set<number>>(new Set());
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(null);
  const [retreatsAttended, setRetreatsAttended] = useState(0);

  const dataUnsubsRef = useRef<Array<() => void>>([]);
  const sessionCheckedRef = useRef(false);

  // ── Google OAuth request ───────────────────────────────────────────────────
  // androidClientId is required on Android (including Expo Go) — fall back to
  // webClientId so the hook doesn't crash. Google sign-in on Android requires a
  // proper EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID for production builds.
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "not-configured";
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? googleClientId;
  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: googleClientId,
    androidClientId: googleAndroidClientId,
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
        // On cold start: if user opted out of Remember Me, sign them out
        if (!sessionCheckedRef.current && !firebaseUser.isAnonymous) {
          sessionCheckedRef.current = true;
          const remembered = await AsyncStorage.getItem(REMEMBER_ME_KEY).catch(() => "true");
          if (remembered === "false") {
            await firebaseSignOut(auth).catch(() => {});
            return;
          }
        } else {
          sessionCheckedRef.current = true;
        }
        setUser(firebaseUser);
        // Register push token for real (non-anonymous) users
        if (!firebaseUser.isAnonymous) {
          registerPushToken()
            .then((token) => {
              if (token) savePushToken(firebaseUser.uid, token).catch(() => {});
            })
            .catch(() => {});
        }
      } else {
        sessionCheckedRef.current = true;
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
            videoLink: b.videoLink,
            serviceName: b.serviceName,
            serviceDuration: b.serviceDuration,
          }))
        )
      )
    );

    dataUnsubsRef.current.push(
      subscribeFavorites(user.uid, (ids) => setFavorites(new Set(ids)))
    );

    dataUnsubsRef.current.push(
      subscribeFollowing(user.uid, (ids) => setFollowing(new Set(ids)))
    );

    dataUnsubsRef.current.push(
      subscribeUserProfile(user.uid, (p) => setRetreatsAttended(p.retreatsAttended ?? 0))
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

  const signInWithEmail = useCallback(async (email: string, password: string, rememberMe = true) => {
    const currentUser = auth.currentUser;
    if (currentUser?.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, password);
      try {
        await linkWithCredential(currentUser, credential);
      } catch {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? "true" : "false").catch(() => {});
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    const currentUser = auth.currentUser;
    if (currentUser?.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, password);
      try {
        const result = await linkWithCredential(currentUser, credential);
        if (displayName.trim()) {
          await updateProfile(result.user, { displayName: displayName.trim() });
        }
      } catch {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName.trim()) {
          await updateProfile(result.user, { displayName: displayName.trim() });
        }
      }
    } else {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName.trim()) {
        await updateProfile(result.user, { displayName: displayName.trim() });
      }
    }
    // Always remember new sign-ups so the session check doesn't immediately sign them out
    await AsyncStorage.setItem(REMEMBER_ME_KEY, "true").catch(() => {});
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const signOut = useCallback(async () => {
    dataUnsubsRef.current.forEach((u) => u());
    dataUnsubsRef.current = [];
    setBookings([]);
    setFavorites(new Set());
    setFollowing(new Set());
    setRetreatsAttended(0);
    await AsyncStorage.removeItem(REMEMBER_ME_KEY).catch(() => {});
    await firebaseSignOut(auth);
    // onAuthStateChanged will trigger anonymous sign-in automatically
  }, []);

  const deleteAccount = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user signed in");

    // Cancel any active Stripe subscriptions before deleting the account
    const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
    try {
      await fetch(`${apiUrl}/api/account`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: currentUser.uid }),
      });
    } catch {
      // Non-fatal — proceed with deletion even if API call fails
    }

    // Clean up local state
    dataUnsubsRef.current.forEach((u) => u());
    dataUnsubsRef.current = [];
    setBookings([]);
    setFavorites(new Set());
    setFollowing(new Set());
    setRetreatsAttended(0);
    await AsyncStorage.removeItem(REMEMBER_ME_KEY).catch(() => {});
    // Delete the Firebase Auth account (requires recent login)
    await deleteUser(currentUser);
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

  const toggleFollowing = useCallback(
    (id: number) => {
      if (!user) return;
      setFollowing((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          removeFollowingFromFirestore(user.uid, id).catch(console.warn);
        } else {
          next.add(id);
          addFollowingToFirestore(user.uid, id).catch(console.warn);
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

  const updatePhotoURL = useCallback(async (url: string) => {
    setLocalPhotoURL(url);
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { photoURL: url }).catch(console.warn);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        userId: user?.uid ?? null,
        isAnonymous: user?.isAnonymous ?? true,
        displayName: user?.displayName ?? null,
        userName: user?.displayName ?? "Friend",
        email: user?.email ?? null,
        photoURL: localPhotoURL ?? user?.photoURL ?? null,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        signOut,
        deleteAccount,
        updatePhotoURL,
        favorites,
        toggleFavorite,
        following,
        toggleFollowing,
        bookings,
        addBooking,
        goingEvents,
        toggleGoingEvent,
        notificationsGranted,
        userReviews,
        addReview,
        dbReady,
        retreatsAttended,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
