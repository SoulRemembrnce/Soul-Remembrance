import { AshTreeBackground } from "@/components/AshTreeBackground";
import { LotusIcon } from "@/components/LotusIcon";
import { AvatarPicker } from "@/components/AvatarPicker";
import { ReviewModal, type ReviewTarget } from "@/components/ReviewModal";
import { Feather } from "@expo/vector-icons";
import * as Calendar from "expo-calendar";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { Practitioner } from "@/constants/data";
import {
  FSPractitionerProfile,
  FSVerificationApplication,
  FSVendorApplication,
  FSVendorProfile,
  profileToPractitioner,
  setFeaturedUntil,
  subscribePractitionerProfile,
  subscribePractitionerProfiles,
  subscribeVerificationApplicationByUid,
  subscribeVendorApplicationByUid,
  subscribeVendorProfile,
  subscribeVendorProducts,
  updatePractitionerPhotoURL,
  updatePractitionerStripeAccount,
  updatePractitionerSubscription,
} from "@/lib/firestore";
import { usePaymentSheet } from "@/hooks/usePaymentSheet";
import { uploadAvatar } from "@/lib/storage";

const MENU_ITEMS = [
  { icon: "message-circle", label: "Messages", route: "/messages" },
  { icon: "file-text", label: "Signed Waivers", route: "/saved-waivers" },
  { icon: "credit-card", label: "Payment Methods", route: "/payment-methods" },
  { icon: "settings", label: "Settings", route: "/settings" },
  { icon: "help-circle", label: "Help & Support", route: "/help" },
  { icon: "shield", label: "Privacy Policy", route: "/privacy" },
];

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function isUpcoming(dateStr: string): boolean {
  if (dateStr === "Today") return true;
  const parts = dateStr.split(" ");
  if (parts.length >= 3) {
    const day = parseInt(parts[1]);
    const month = MONTH_MAP[parts[2]];
    if (!isNaN(day) && month !== undefined) {
      const sessionDate = new Date(new Date().getFullYear(), month, day);
      return sessionDate >= new Date(new Date().setHours(0, 0, 0, 0));
    }
  }
  return true;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    bookings, favorites, following, userReviews,
    isAnonymous, displayName, email, photoURL,
    signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset,
    signOut, deleteAccount, userId, updatePhotoURL,
    notificationsGranted, goingEvents, retreatsAttended,
  } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const sessionsY = useRef(0);

  // ── Email auth modal state ──────────────────────────────────────────────────
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [emailAuthLoading, setEmailAuthLoading] = useState(false);
  const [emailAuthError, setEmailAuthError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const openEmailModal = useCallback((mode: "signin" | "signup") => {
    setEmailMode(mode);
    setEmailInput("");
    setPasswordInput("");
    setNameInput("");
    setEmailAuthError("");
    setResetSent(false);
    setShowPasswordModal(false);
    setEmailModalVisible(true);
  }, []);

  const handleEmailAuth = useCallback(async () => {
    const trimEmail = emailInput.trim();
    const trimName = nameInput.trim();
    if (!trimEmail || !passwordInput) {
      setEmailAuthError("Please enter your email and password.");
      return;
    }
    if (passwordInput.length < 6) {
      setEmailAuthError("Password must be at least 6 characters.");
      return;
    }
    setEmailAuthLoading(true);
    setEmailAuthError("");
    try {
      if (emailMode === "signup") {
        await signUpWithEmail(trimEmail, passwordInput, trimName);
      } else {
        await signInWithEmail(trimEmail, passwordInput);
      }
      setEmailModalVisible(false);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-already-in-use") setEmailAuthError("An account already exists with this email. Try signing in instead.");
      else if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") setEmailAuthError("Incorrect email or password.");
      else if (code === "auth/invalid-email") setEmailAuthError("Please enter a valid email address.");
      else if (code === "auth/too-many-requests") setEmailAuthError("Too many attempts. Please try again later.");
      else setEmailAuthError("Something went wrong. Please try again.");
    } finally {
      setEmailAuthLoading(false);
    }
  }, [emailMode, emailInput, passwordInput, nameInput, signInWithEmail, signUpWithEmail]);

  const handlePasswordReset = useCallback(async () => {
    const trimEmail = emailInput.trim();
    if (!trimEmail) { setEmailAuthError("Enter your email above first."); return; }
    setEmailAuthLoading(true);
    try {
      await sendPasswordReset(trimEmail);
      setResetSent(true);
      setEmailAuthError("");
    } catch {
      setEmailAuthError("Could not send reset email. Check the address and try again.");
    } finally {
      setEmailAuthLoading(false);
    }
  }, [emailInput, sendPasswordReset]);

  const [sessionTab, setSessionTab] = useState<"upcoming" | "past">("upcoming");
  const [myProfile, setMyProfile] = useState<FSPractitionerProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<FSPractitionerProfile[]>([]);
  const [connectLoading, setConnectLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  const pendingSessionIdRef = useRef<string | null>(null);
  const [clientPhotoUploading, setClientPhotoUploading] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [verificationApp, setVerificationApp] = useState<FSVerificationApplication | null>(null);
  const [myVendorProfile, setMyVendorProfile] = useState<FSVendorProfile | null>(null);
  const [vendorApp, setVendorApp] = useState<FSVendorApplication | null>(null);
  const [vendorProductCount, setVendorProductCount] = useState(0);

  const handleChangeClientPhoto = () => {
    if (Platform.OS === "web") { pickClientPhoto("library"); return; }
    Alert.alert("Profile Photo", "Choose a photo", [
      { text: "Take Photo", onPress: () => pickClientPhoto("camera") },
      { text: "Choose from Library", onPress: () => pickClientPhoto("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickClientPhoto = async (source: "camera" | "library") => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        if (Platform.OS !== "web") {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission needed", "Camera access is required.");
            return;
          }
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      }
      if (result.canceled || !userId) return;
      setClientPhotoUploading(true);
      const url = await uploadAvatar(userId, result.assets[0].uri, "client");
      await updatePhotoURL(url);
    } catch {
      Alert.alert("Upload failed", "Could not upload photo. Please try again.");
    } finally {
      setClientPhotoUploading(false);
    }
  };

  // Subscribe to own practitioner profile (if user is a practitioner)
  useEffect(() => {
    if (!userId) return;
    return subscribePractitionerProfile(userId, setMyProfile);
  }, [userId]);

  // Subscribe to all active practitioners (for saved/favourites display)
  useEffect(() => {
    return subscribePractitionerProfiles(setAllProfiles);
  }, []);

  // Subscribe to own verification application status
  useEffect(() => {
    if (!userId) return;
    return subscribeVerificationApplicationByUid(userId, setVerificationApp);
  }, [userId]);

  // Subscribe to own vendor profile and application
  useEffect(() => {
    if (!userId) return;
    const unsubProfile = subscribeVendorProfile(userId, setMyVendorProfile);
    const unsubApp = subscribeVendorApplicationByUid(userId, setVendorApp);
    return () => { unsubProfile(); unsubApp(); };
  }, [userId]);

  // Subscribe to vendor products count when vendor
  useEffect(() => {
    if (!userId || !myVendorProfile) return;
    return subscribeVendorProducts(userId, (products) => setVendorProductCount(products.length));
  }, [userId, myVendorProfile]);

  // When the app returns to foreground, check if the Stripe subscription was completed
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;
      const sessionId = pendingSessionIdRef.current;
      if (!sessionId || !userId) return;
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
        const resp = await fetch(
          `${apiUrl}/api/subscriptions/check?sessionId=${encodeURIComponent(sessionId)}`
        );
        if (!resp.ok) return;
        const { subscribed, subscriptionId, customerId } = await resp.json();
        if (subscribed) {
          pendingSessionIdRef.current = null;
          await updatePractitionerSubscription(userId, {
            subscriptionActive: true,
            ...(typeof subscriptionId === "string" && { subscriptionId }),
            ...(typeof customerId === "string" && { stripeCustomerId: customerId }),
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            "Welcome to Soul Remembrance! ✨",
            "Your 30-day free trial is now active. Clients can discover and book you straight away."
          );
        }
      } catch {
        // silent — will retry next time app comes to foreground
      } finally {
        setSubscribeLoading(false);
      }
    });
    return () => sub.remove();
  }, [userId]);

  const handleSubscribe = async () => {
    if (!userId || !myProfile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubscribeLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
      const successUrl = `${apiUrl}/api/subscriptions/success`;
      const cancelUrl = `${apiUrl}/api/subscriptions/cancelled`;
      const resp = await fetch(`${apiUrl}/api/payments/create-subscription-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: myProfile.name,
          email: email ?? undefined,
          successUrl,
          cancelUrl,
        }),
      });
      if (!resp.ok) {
        const { error } = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error ?? "Could not start subscription");
      }
      const { url, sessionId } = await resp.json();
      // Store session ID so AppState listener can verify after return
      if (sessionId) pendingSessionIdRef.current = sessionId;
      // Open Stripe Checkout in the browser
      await Linking.openURL(url);
    } catch (err: any) {
      setSubscribeLoading(false);
      Alert.alert("Subscription Error", err.message ?? "Something went wrong. Please try again.");
    }
  };

  const checkConnectStatus = async (accountId: string) => {
    if (!userId) return;
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
      const resp = await fetch(`${apiUrl}/api/connect/status/${accountId}`);
      if (!resp.ok) return;
      const { enabled } = await resp.json();
      if (enabled) {
        await updatePractitionerStripeAccount(userId, accountId, true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // silent — status checked on next open
    }
  };

  const handleConnectStripe = async () => {
    if (!userId || !myProfile) return;
    setConnectLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
      const resp = await fetch(`${apiUrl}/api/connect/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email: email ?? undefined,
          name: myProfile.name,
          existingAccountId: myProfile.stripeAccountId ?? undefined,
        }),
      });
      if (!resp.ok) {
        const { error } = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error ?? "Failed to start payout setup");
      }
      const { url, accountId } = await resp.json();
      // Save accountId immediately so it persists even if onboarding is incomplete
      await updatePractitionerStripeAccount(userId, accountId, false);
      // Open Stripe Connect onboarding in browser
      await WebBrowser.openBrowserAsync(url, {
        toolbarColor: "#2D1B69",
        controlsColor: "#C9A84C",
      });
      // After browser closes, check if onboarding completed
      await checkConnectStatus(accountId);
    } catch (err: any) {
      const msg = err.message ?? "Something went wrong. Please try again.";
      const isStripeSetup = msg.toLowerCase().includes("platform") || msg.toLowerCase().includes("capability") || msg.toLowerCase().includes("not configured");
      Alert.alert(
        "Payout Setup Error",
        isStripeSetup
          ? "Your Stripe platform account needs to be completed first. Visit dashboard.stripe.com, finish your business details, then try again."
          : msg
      );
    } finally {
      setConnectLoading(false);
    }
  };

  const handleGetFeatured = async () => {
    if (!userId || !myProfile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFeaturedLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
      const resp = await fetch(`${apiUrl}/api/payments/create-featured-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!resp.ok) {
        const { error } = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error ?? "Could not start payment");
      }
      const { clientSecret } = await resp.json();
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Soul Remembrance",
      });
      if (initError) throw new Error(initError.message);
      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if ((payError as any).code !== "Canceled") throw new Error(payError.message);
        return;
      }
      const featuredDate = new Date();
      featuredDate.setDate(featuredDate.getDate() + 30);
      await setFeaturedUntil(userId, featuredDate);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "You're Featured! ⭐",
        "Your profile will appear in the Featured Practitioners section on the home screen for the next 30 days."
      );
    } catch (err: any) {
      Alert.alert("Payment Error", err.message ?? "Something went wrong. Please try again.");
    } finally {
      setFeaturedLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const favPractitioners = (allProfiles.map(profileToPractitioner) as Practitioner[]).filter(
    (p) => favorites.has(p.id)
  );
  const upcomingBookings = bookings.filter((b) => isUpcoming(b.date));
  const pastBookings = bookings.filter((b) => !isUpcoming(b.date));
  const shownBookings = sessionTab === "upcoming" ? upcomingBookings : pastBookings;

  const addToDeviceCalendar = useCallback(async (b: (typeof bookings)[0]) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow calendar access to save bookings.");
        return;
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCal = calendars.find((c) => c.isPrimary) ?? calendars[0];
      if (!defaultCal) {
        Alert.alert("No calendar", "No writable calendar found on this device.");
        return;
      }
      const MONTHS: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      };
      const parts = b.date.split(" ");
      const day = parseInt(parts[1] ?? "1");
      const month = MONTHS[parts[2] ?? "Jan"] ?? 0;
      const year = new Date().getFullYear();
      const [hour, minute] = (b.time ?? "09:00").split(":").map(Number);
      const start = new Date(year, month, day, hour, minute);
      const durationMs = (b.serviceDuration ?? 60) * 60 * 1000;
      const end = new Date(start.getTime() + durationMs);
      await Calendar.createEventAsync(defaultCal.id, {
        title: `${b.serviceName ?? "Session"} with ${b.practitionerName}`,
        startDate: start,
        endDate: end,
        notes: b.online
          ? b.videoLink ? `Join: ${b.videoLink}` : "Online session"
          : `Location: ${b.location}`,
        alarms: [{ relativeOffset: -60 }, { relativeOffset: -1440 }],
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved to Calendar", `"${b.serviceName ?? "Session"} with ${b.practitionerName}" added.`);
    } catch {
      Alert.alert("Error", "Could not add to calendar. Please try again.");
    }
  }, [bookings]);
  const myReviewCount = userReviews.length;

  // Derive display name and initials
  const profileName = displayName ?? "Soul Seeker";
  const initials = profileName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const scrollToSessions = () => {
    scrollRef.current?.scrollTo({ y: sessionsY.current - 12, animated: true });
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut().catch(console.warn),
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Your profile, bookings, messages and all personal data will be erased forever.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete Everything",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAccount();
                    } catch (err: any) {
                      if (err?.code === "auth/requires-recent-login") {
                        Alert.alert(
                          "Re-authentication Required",
                          "For security, please sign out and sign back in before deleting your account.",
                          [{ text: "OK" }]
                        );
                      } else {
                        Alert.alert("Error", err?.message ?? "Could not delete account. Please try again.");
                      }
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <AshTreeBackground />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
      {/* Profile Header */}
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <LotusIcon size={20} style={{ alignSelf: "center", marginBottom: 10, opacity: 0.65 }} />
        <TouchableOpacity onPress={handleChangeClientPhoto} style={styles.avatarWrap} activeOpacity={0.85}>
          {photoURL ? (
            <Image
              source={{ uri: photoURL }}
              style={styles.avatarPhoto}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          {clientPhotoUploading ? (
            <View style={[styles.avatarEditOverlay, { borderRadius: 28 }]}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          ) : (
            <View style={[styles.avatarEditBadge, { backgroundColor: "rgba(45,27,105,0.9)" }]}>
              <Feather name="camera" size={10} color="#fff" />
            </View>
          )}
          {!isAnonymous && (
            <View style={[styles.googleBadge, { backgroundColor: "#fff" }]}>
              <GoogleColorIcon size={12} />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.profileName}>{profileName}</Text>
        {email ? (
          <Text style={styles.profileSub}>{email}</Text>
        ) : (
          <Text style={styles.profileSub}>Soul Seeker · Member since 2024</Text>
        )}

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.stat} onPress={scrollToSessions}>
            <Text style={styles.statNum}>{bookings.length}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{favorites.size}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{myReviewCount}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Journey Stats */}
      <View style={[styles.journeyCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
        <View style={styles.journeyItem}>
          <Text style={[styles.journeyNum, { color: colors.deepIndigo }]}>{following.size}</Text>
          <Text style={[styles.journeyLabel, { color: colors.sage }]}>Following</Text>
        </View>
        <View style={[styles.journeyDivider, { backgroundColor: colors.blush }]} />
        <View style={styles.journeyItem}>
          <Text style={[styles.journeyNum, { color: colors.deepIndigo }]}>{goingEvents.size}</Text>
          <Text style={[styles.journeyLabel, { color: colors.sage }]}>Events</Text>
        </View>
        <View style={[styles.journeyDivider, { backgroundColor: colors.blush }]} />
        <View style={styles.journeyItem}>
          <Text style={[styles.journeyNum, { color: colors.deepIndigo }]}>{retreatsAttended}</Text>
          <Text style={[styles.journeyLabel, { color: colors.sage }]}>Retreats</Text>
        </View>
      </View>

      {/* Sign in section — shown only when anonymous */}
      {isAnonymous && (
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* Google */}
          <TouchableOpacity
            style={[styles.googleBtn, { backgroundColor: colors.card, borderColor: colors.cream }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); signInWithGoogle(); }}
            activeOpacity={0.85}
          >
            <GoogleColorIcon size={20} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.googleBtnTitle, { color: colors.charcoal }]}>Continue with Google</Text>
              <Text style={[styles.googleBtnSub, { color: colors.sage }]}>Save your bookings and favourites across devices</Text>
            </View>
            <Feather name="arrow-right" size={16} color={colors.sage} />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.authDivider}>
            <View style={[styles.authDividerLine, { backgroundColor: colors.blush }]} />
            <Text style={[styles.authDividerText, { color: colors.sage }]}>or</Text>
            <View style={[styles.authDividerLine, { backgroundColor: colors.blush }]} />
          </View>

          {/* Email sign-in */}
          <TouchableOpacity
            style={[styles.emailBtn, { backgroundColor: colors.deepIndigo }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openEmailModal("signin"); }}
            activeOpacity={0.85}
          >
            <Feather name="mail" size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.emailBtnTitle}>Sign in with Email</Text>
              <Text style={styles.emailBtnSub}>Use your email address and password</Text>
            </View>
            <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          {/* Create account link */}
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); openEmailModal("signup"); }}
            style={{ alignItems: "center", marginTop: 14 }}
            activeOpacity={0.7}
          >
            <Text style={[styles.googleBtnSub, { color: colors.sage }]}>
              New here?{" "}
              <Text style={{ color: colors.deepIndigo, fontFamily: "Inter_600SemiBold" }}>Create a free account</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/privacy")}
            style={{ alignItems: "center", marginTop: 10 }}
            activeOpacity={0.7}
          >
            <Text style={[styles.googleBtnSub, { color: colors.sage }]}>
              By continuing you agree to our{" "}
              <Text style={{ color: colors.deepIndigo, fontFamily: "Inter_600SemiBold" }}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Email auth modal */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <TouchableOpacity
            style={styles.emailModalOverlay}
            activeOpacity={1}
            onPress={() => setEmailModalVisible(false)}
          />
          <View style={[styles.emailModalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.emailModalHandle, { backgroundColor: colors.blush }]} />

            {/* Mode toggle */}
            <View style={[styles.emailModeToggle, { backgroundColor: colors.cream }]}>
              {(["signin", "signup"] as const).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.emailModeBtn, emailMode === m && { backgroundColor: colors.deepIndigo }]}
                  onPress={() => { setEmailMode(m); setEmailAuthError(""); setResetSent(false); }}
                >
                  <Text style={[styles.emailModeBtnText, { color: emailMode === m ? "#fff" : colors.sage }]}>
                    {m === "signin" ? "Sign In" : "Create Account"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name — create account only */}
            {emailMode === "signup" && (
              <TextInput
                style={[styles.emailInput, { color: colors.charcoal, borderColor: colors.blush, backgroundColor: colors.softWhite }]}
                placeholder="Your name (optional)"
                placeholderTextColor={colors.sage}
                value={nameInput}
                onChangeText={setNameInput}
                autoCapitalize="words"
                returnKeyType="next"
              />
            )}

            <TextInput
              style={[styles.emailInput, { color: colors.charcoal, borderColor: colors.blush, backgroundColor: colors.softWhite }]}
              placeholder="Email address"
              placeholderTextColor={colors.sage}
              value={emailInput}
              onChangeText={v => { setEmailInput(v); setEmailAuthError(""); setResetSent(false); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <View style={[styles.emailInput, styles.passwordRow, { borderColor: colors.blush, backgroundColor: colors.softWhite }]}>
              <TextInput
                style={{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.charcoal }}
                placeholder="Password (min. 6 characters)"
                placeholderTextColor={colors.sage}
                value={passwordInput}
                onChangeText={v => { setPasswordInput(v); setEmailAuthError(""); }}
                secureTextEntry={!showPasswordModal}
                returnKeyType="done"
                onSubmitEditing={handleEmailAuth}
              />
              <TouchableOpacity
                onPress={() => setShowPasswordModal(v => !v)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ paddingHorizontal: 6, flexShrink: 0 }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.deepIndigo }}>
                  {showPasswordModal ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error / reset sent */}
            {emailAuthError !== "" && (
              <Text style={[styles.emailError, { color: colors.destructive }]}>{emailAuthError}</Text>
            )}
            {resetSent && (
              <Text style={[styles.emailError, { color: "#16A34A" }]}>Reset email sent — check your inbox.</Text>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.emailSubmitBtn, { backgroundColor: colors.deepIndigo, opacity: emailAuthLoading ? 0.6 : 1 }]}
              onPress={handleEmailAuth}
              disabled={emailAuthLoading}
              activeOpacity={0.85}
            >
              {emailAuthLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.emailSubmitText}>{emailMode === "signin" ? "Sign In" : "Create Account"}</Text>}
            </TouchableOpacity>

            {/* Forgot password — sign-in mode only */}
            {emailMode === "signin" && !resetSent && (
              <TouchableOpacity
                onPress={handlePasswordReset}
                style={{ alignItems: "center", marginTop: 12 }}
                disabled={emailAuthLoading}
                activeOpacity={0.7}
              >
                <Text style={[styles.googleBtnSub, { color: colors.sage }]}>
                  Forgot your password?{" "}
                  <Text style={{ color: colors.deepIndigo, fontFamily: "Inter_600SemiBold" }}>Reset it</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Practitioner Dashboard — shown when user is a practitioner */}
      {myProfile && !isAnonymous && (
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Text style={[styles.sectionLabel, { color: colors.warmGold, marginBottom: 12 }]}>
            PRACTITIONER DASHBOARD
          </Text>
          <View style={[styles.dashCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
            {/* Profile row */}
            <View style={styles.dashRow}>
              <AvatarPicker
                userId={userId!}
                photoURL={myProfile.photoURL}
                initials={myProfile.initials}
                avatarColor={myProfile.avatarColor as [string, string]}
                size={44}
                role="practitioner"
                onPhotoChange={(url) => {
                  updatePractitionerPhotoURL(userId!, url).catch(console.warn);
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.dashName, { color: colors.charcoal }]}>{myProfile.name}</Text>
                <Text style={[styles.dashTitle, { color: colors.sage }]}>{myProfile.title}</Text>
              </View>
              {myProfile.verified && (
                <View style={[styles.verifiedBadge, { backgroundColor: colors.cream }]}>
                  <Feather name="check-circle" size={12} color={colors.deepIndigo} />
                  <Text style={[styles.verifiedText, { color: colors.deepIndigo }]}>Verified</Text>
                </View>
              )}
            </View>

            <View style={[styles.dashDivider, { backgroundColor: colors.blush }]} />

            {/* Subscription status */}
            {myProfile.subscriptionActive ? (
              <View style={styles.subActiveRow}>
                <View style={[styles.subActiveDot, { backgroundColor: "#38a169" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subActiveTitle, { color: colors.charcoal }]}>
                    Subscription active
                  </Text>
                  <Text style={[styles.subActiveSub, { color: colors.sage }]}>
                    £3.99/month · renews automatically
                  </Text>
                </View>
                <View style={[styles.subBadge, { backgroundColor: "#38a16920" }]}>
                  <Text style={[styles.subBadgeText, { color: "#38a169" }]}>Active</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.subActivateBtn, {
                  backgroundColor: `${colors.warmGold}18`,
                  borderColor: colors.warmGold,
                }]}
                onPress={handleSubscribe}
                disabled={subscribeLoading}
                activeOpacity={0.85}
              >
                {subscribeLoading ? (
                  <ActivityIndicator color={colors.warmGold} size="small" style={{ paddingVertical: 4 }} />
                ) : (
                  <>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subActivateTitle, { color: colors.charcoal }]}>
                        Activate your listing
                      </Text>
                      <Text style={[styles.subActivateSub, { color: colors.sage }]}>
                        30-day free trial — then £3.99/month
                      </Text>
                    </View>
                    <View style={[styles.subArrow, { backgroundColor: colors.warmGold }]}>
                      <Feather name="arrow-right" size={14} color="#fff" />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={[styles.dashDivider, { backgroundColor: colors.blush }]} />

            {/* Payout status */}
            {myProfile.stripeAccountEnabled ? (
              <View style={styles.payoutsActiveRow}>
                <Feather name="check-circle" size={16} color="#38a169" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.payoutsActiveText}>Payouts active</Text>
                  <Text style={[styles.payoutsSub, { color: colors.sage }]}>
                    97% of each session paid to you automatically
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.payoutsBtn, { backgroundColor: colors.deepIndigo }]}
                onPress={handleConnectStripe}
                disabled={connectLoading}
                activeOpacity={0.85}
              >
                {connectLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={{ color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold", lineHeight: 20 }}>£</Text>
                    <Text style={styles.payoutsBtnText}>
                      {myProfile.stripeAccountId ? "Complete payout setup" : "Set up payouts"}
                    </Text>
                    <Feather name="arrow-right" size={14} color="rgba(255,255,255,0.7)" />
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={[styles.dashDivider, { backgroundColor: colors.blush }]} />

            {/* Stats */}
            <View style={styles.dashStats}>
              <View style={styles.dashStat}>
                <Text style={[styles.dashStatNum, { color: colors.charcoal }]}>
                  {myProfile.reviewCount}
                </Text>
                <Text style={[styles.dashStatLabel, { color: colors.sage }]}>Reviews</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.blush, height: 30 }]} />
              <View style={styles.dashStat}>
                <Text style={[styles.dashStatNum, { color: colors.charcoal }]}>
                  {myProfile.rating > 0 ? `★ ${myProfile.rating.toFixed(1)}` : "—"}
                </Text>
                <Text style={[styles.dashStatLabel, { color: colors.sage }]}>Rating</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.blush, height: 30 }]} />
              <View style={styles.dashStat}>
                <Text style={[styles.dashStatNum, { color: colors.charcoal }]}>£{myProfile.rate}</Text>
                <Text style={[styles.dashStatLabel, { color: colors.sage }]}>Per session</Text>
              </View>
            </View>

            <View style={[styles.dashDivider, { backgroundColor: colors.blush }]} />

            {/* Get Verified */}
            {!myProfile.verified && (
              <TouchableOpacity
                style={[
                  styles.getVerifiedBtn,
                  {
                    backgroundColor:
                      verificationApp?.status === "pending"
                        ? `${colors.warmGold}15`
                        : verificationApp?.status === "rejected"
                        ? "#FEF2F2"
                        : `${colors.deepIndigo}08`,
                    borderColor:
                      verificationApp?.status === "pending"
                        ? colors.warmGold
                        : verificationApp?.status === "rejected"
                        ? "#FCA5A5"
                        : colors.deepIndigo,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/verification");
                }}
                disabled={verificationApp?.status === "pending"}
                activeOpacity={0.85}
              >
                {verificationApp?.status === "pending" ? (
                  <>
                    <Feather name="clock" size={15} color={colors.warmGold} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.getVerifiedTitle, { color: colors.charcoal }]}>Verification pending</Text>
                      <Text style={[styles.getVerifiedSub, { color: colors.sage }]}>Under review · usually 2–5 working days</Text>
                    </View>
                  </>
                ) : verificationApp?.status === "rejected" ? (
                  <>
                    <Feather name="alert-circle" size={15} color="#E53E3E" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.getVerifiedTitle, { color: colors.charcoal }]}>Not approved · tap to reapply</Text>
                      <Text style={[styles.getVerifiedSub, { color: colors.sage }]}>
                        {verificationApp.rejectionNote || "See verification screen for details"}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={14} color={colors.sage} />
                  </>
                ) : (
                  <>
                    <Feather name="shield" size={15} color={colors.deepIndigo} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.getVerifiedTitle, { color: colors.charcoal }]}>Get Verified · £2.99</Text>
                      <Text style={[styles.getVerifiedSub, { color: colors.sage }]}>One-time payment · appear at top of listings</Text>
                    </View>
                    <Feather name="chevron-right" size={14} color={colors.deepIndigo} />
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={[styles.dashDivider, { backgroundColor: colors.blush }]} />

            {/* Manage services */}
            <TouchableOpacity
              style={[styles.availabilityBtn, { borderColor: colors.deepIndigo }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: "/manage-services",
                  params: {
                    numericId: String(myProfile.numericId),
                    practitionerName: myProfile.name,
                  },
                });
              }}
              activeOpacity={0.85}
            >
              <Feather name="briefcase" size={16} color={colors.deepIndigo} />
              <Text style={[styles.availabilityBtnText, { color: colors.deepIndigo }]}>
                Manage Services
              </Text>
              <Feather name="chevron-right" size={14} color={colors.deepIndigo} />
            </TouchableOpacity>

            <View style={[styles.dashDivider, { backgroundColor: colors.blush }]} />

            {/* Waivers & Forms */}
            <TouchableOpacity
              style={[styles.availabilityBtn, { borderColor: colors.deepIndigo }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: "/practitioner-waivers",
                  params: {
                    numericId: String(myProfile.numericId),
                    name: myProfile.name,
                  },
                });
              }}
              activeOpacity={0.85}
            >
              <Feather name="file-text" size={16} color={colors.deepIndigo} />
              <Text style={[styles.availabilityBtnText, { color: colors.deepIndigo }]}>
                Waivers & Forms
              </Text>
              <Feather name="chevron-right" size={14} color={colors.deepIndigo} />
            </TouchableOpacity>

            <View style={[styles.dashDivider, { backgroundColor: colors.blush }]} />

            {/* Manage availability */}
            <TouchableOpacity
              style={[styles.availabilityBtn, { borderColor: colors.deepIndigo }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: "/manage-availability",
                  params: {
                    numericId: String(myProfile.numericId),
                    practitionerName: myProfile.name,
                  },
                });
              }}
              activeOpacity={0.85}
            >
              <Feather name="calendar" size={16} color={colors.deepIndigo} />
              <Text style={[styles.availabilityBtnText, { color: colors.deepIndigo }]}>
                Manage Availability
              </Text>
              <Feather name="chevron-right" size={14} color={colors.deepIndigo} />
            </TouchableOpacity>

            <View style={[styles.dashDivider, { backgroundColor: colors.blush }]} />

            {/* Get Featured */}
            {myProfile.featuredUntil && myProfile.featuredUntil.toDate() > new Date() ? (
              <View style={styles.featuredActiveRow}>
                <Text style={styles.featuredStar}>⭐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featuredActiveTitle, { color: colors.charcoal }]}>
                    Featured listing active
                  </Text>
                  <Text style={[styles.featuredActiveSub, { color: colors.sage }]}>
                    {Math.ceil(
                      (myProfile.featuredUntil.toDate().getTime() - Date.now()) / 86400000
                    )}{" "}
                    days remaining
                  </Text>
                </View>
                <View style={[styles.subBadge, { backgroundColor: `${colors.warmGold}22` }]}>
                  <Text style={[styles.subBadgeText, { color: colors.warmGold }]}>Featured</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.featuredBtn, {
                  backgroundColor: `${colors.warmGold}12`,
                  borderColor: colors.warmGold,
                }]}
                onPress={handleGetFeatured}
                disabled={featuredLoading}
                activeOpacity={0.85}
              >
                {featuredLoading ? (
                  <ActivityIndicator color={colors.warmGold} size="small" style={{ paddingVertical: 4 }} />
                ) : (
                  <>
                    <Text style={styles.featuredStar}>⭐</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.featuredBtnTitle, { color: colors.charcoal }]}>
                        Get Featured
                      </Text>
                      <Text style={[styles.featuredBtnSub, { color: colors.sage }]}>
                        Top of home screen · £4.99 / 30 days
                      </Text>
                    </View>
                    <View style={[styles.subArrow, { backgroundColor: colors.warmGold }]}>
                      <Feather name="arrow-right" size={14} color="#fff" />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Vendor dashboard — shown when approved as a vendor */}
      {myVendorProfile && !isAnonymous && (
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={[styles.sectionLabel, { color: colors.warmGold, marginBottom: 12 }]}>
            VENDOR DASHBOARD
          </Text>
          <View style={[styles.dashCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
            <View style={styles.dashRow}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.deepIndigo}18`, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 22 }}>🏪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dashName, { color: colors.charcoal }]}>{myVendorProfile.businessName}</Text>
                <Text style={[styles.dashTitle, { color: colors.sage }]}>Soul Shop Vendor</Text>
              </View>
              <View style={[styles.verifiedBadge, { backgroundColor: "#C6F6D5" }]}>
                <Feather name="check-circle" size={12} color="#38a169" />
                <Text style={[styles.verifiedText, { color: "#38a169" }]}>Approved</Text>
              </View>
            </View>

            <View style={[styles.dashDivider, { backgroundColor: colors.blush }]} />

            {/* Product stats */}
            <View style={styles.dashStats}>
              <View style={styles.dashStat}>
                <Text style={[styles.dashStatNum, { color: colors.charcoal }]}>{vendorProductCount}</Text>
                <Text style={[styles.dashStatLabel, { color: colors.sage }]}>Products</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.blush, height: 30 }]} />
              <View style={styles.dashStat}>
                <Text style={[styles.dashStatNum, { color: colors.charcoal }]}>
                  {myVendorProfile.categories.length}
                </Text>
                <Text style={[styles.dashStatLabel, { color: colors.sage }]}>Categories</Text>
              </View>
            </View>

            <View style={[styles.dashDivider, { backgroundColor: colors.blush }]} />

            {/* Manage Products button */}
            <TouchableOpacity
              style={[styles.payoutsBtn, { backgroundColor: colors.deepIndigo }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/vendor-products" as any); }}
              activeOpacity={0.85}
            >
              <Feather name="package" size={16} color="#fff" />
              <Text style={styles.payoutsBtnText}>Manage My Products</Text>
              <Feather name="arrow-right" size={14} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Vendor status card — shown when application is pending or rejected (not yet approved) */}
      {!myVendorProfile && vendorApp && !isAnonymous && (
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <TouchableOpacity
            style={[
              styles.getVerifiedBtn,
              {
                backgroundColor: vendorApp.status === "pending" ? `${colors.warmGold}15` : "#FEF2F2",
                borderColor: vendorApp.status === "pending" ? colors.warmGold : "#FCA5A5",
              },
            ]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/vendor-onboarding" as any); }}
            disabled={vendorApp.status === "pending"}
            activeOpacity={0.85}
          >
            {vendorApp.status === "pending" ? (
              <>
                <Feather name="clock" size={15} color={colors.warmGold} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.getVerifiedTitle, { color: colors.charcoal }]}>Vendor application pending</Text>
                  <Text style={[styles.getVerifiedSub, { color: colors.sage }]}>Under review · usually 2–3 working days</Text>
                </View>
              </>
            ) : (
              <>
                <Feather name="alert-circle" size={15} color="#E53E3E" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.getVerifiedTitle, { color: colors.charcoal }]}>Vendor application not approved · tap to reapply</Text>
                  <Text style={[styles.getVerifiedSub, { color: colors.sage }]}>{vendorApp.rejectionNote || "See vendor onboarding for details"}</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Become a Practitioner — only shown if not already one */}
      {!myProfile && (
        <View style={{ padding: 20, paddingTop: isAnonymous ? 12 : 20 }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/onboarding");
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.purpleMid, "#5A3A9A"]}
              style={styles.practitionerBanner}
            >
              <View>
                <Text style={styles.bannerTitle}>Become a Practitioner</Text>
                <Text style={styles.bannerBody}>Share your healing gifts. £3.99/mo after 30-day free trial.</Text>
              </View>
              <View style={[styles.bannerArrow, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Feather name="arrow-right" size={18} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Become a Vendor — shown when not already a vendor and no pending application */}
      {!myVendorProfile && !vendorApp && !isAnonymous && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/vendor-onboarding" as any);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.warmGold, "#B8860B"]}
              style={styles.practitionerBanner}
            >
              <View>
                <Text style={styles.bannerTitle}>Sell in the Soul Shop</Text>
                <Text style={styles.bannerBody}>Apply to list your spiritual products. Free to join.</Text>
              </View>
              <View style={[styles.bannerArrow, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Feather name="arrow-right" size={18} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ── MY SESSIONS ─────────────────────────────────────── */}
      <View
        style={styles.section}
        onLayout={(e) => { sessionsY.current = e.nativeEvent.layout.y; }}
      >
        <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>MY SESSIONS</Text>

        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.cream }]}>
          {(["upcoming", "past"] as const).map((tab) => {
            const active = sessionTab === tab;
            const count = tab === "upcoming" ? upcomingBookings.length : pastBookings.length;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabBtn,
                  active && {
                    backgroundColor: colors.softWhite,
                    shadowColor: "#000",
                    shadowOpacity: 0.08,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                    elevation: 2,
                  },
                ]}
                onPress={() => {
                  setSessionTab(tab);
                  Haptics.selectionAsync();
                }}
              >
                <Text style={[styles.tabText, { color: active ? colors.deepIndigo : colors.sage }]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: active ? colors.deepIndigo : colors.blush }]}>
                    <Text style={[styles.tabBadgeText, { color: active ? "#fff" : colors.deepIndigo }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Booking cards */}
        {shownBookings.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.deepIndigo}12` }]}>
              <Feather name={sessionTab === "upcoming" ? "calendar" : "clock"} size={26} color={colors.deepIndigo} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>
              {sessionTab === "upcoming" ? "No upcoming sessions" : "No past sessions yet"}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.sage }]}>
              {sessionTab === "upcoming"
                ? "Book a session with a practitioner to get started"
                : "Completed sessions will appear here"}
            </Text>
            {sessionTab === "upcoming" && (
              <TouchableOpacity
                onPress={() => { router.push("/(tabs)/explore"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.emptyBtn, { backgroundColor: colors.deepIndigo }]}
              >
                <Text style={styles.emptyBtnText}>Find a Practitioner</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          shownBookings.map((b) => {
            const upcoming = isUpcoming(b.date);
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.cream }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/practitioner/${b.practitionerId}`);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={b.avatarColor as [string, string]}
                  style={styles.sessionAvatar}
                >
                  <Text style={styles.sessionInitials}>{b.practitionerInitials}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sessionName, { color: colors.charcoal }]}>{b.practitionerName}</Text>
                  <View style={styles.sessionMetaRow}>
                    <Feather name="calendar" size={11} color={colors.sage} />
                    <Text style={[styles.sessionMeta, { color: colors.sage }]}>{b.date}</Text>
                    <Feather name="clock" size={11} color={colors.sage} />
                    <Text style={[styles.sessionMeta, { color: colors.sage }]}>{b.time}</Text>
                  </View>
                  <View style={styles.sessionTagRow}>
                    {b.serviceName ? (
                      <View style={[styles.sessionTag, { backgroundColor: `${colors.purpleMid}18` }]}>
                        <Feather name="briefcase" size={9} color={colors.purpleMid} />
                        <Text style={[styles.sessionTagText, { color: colors.purpleMid }]}>
                          {b.serviceName}
                        </Text>
                      </View>
                    ) : null}
                    <View style={[styles.sessionTag, { backgroundColor: b.online ? `${colors.deepIndigo}14` : `${colors.warmGold}18` }]}>
                      <Feather name={b.online ? "video" : "map-pin"} size={9} color={b.online ? colors.deepIndigo : colors.warmGold} />
                      <Text style={[styles.sessionTagText, { color: b.online ? colors.deepIndigo : colors.warmGold }]}>
                        {b.online ? "Online" : b.location}
                      </Text>
                    </View>
                    {b.serviceDuration ? (
                      <View style={[styles.sessionTag, { backgroundColor: `${colors.deepIndigo}14` }]}>
                        <Feather name="clock" size={9} color={colors.deepIndigo} />
                        <Text style={[styles.sessionTagText, { color: colors.deepIndigo }]}>
                          {b.serviceDuration < 60 ? `${b.serviceDuration}m` : `${b.serviceDuration / 60}h`}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {upcoming && b.videoLink ? (
                    <TouchableOpacity
                      style={[styles.joinCallBtn, { backgroundColor: colors.deepIndigo }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Linking.openURL(b.videoLink!);
                      }}
                      activeOpacity={0.8}
                    >
                      <Feather name="video" size={12} color="#fff" />
                      <Text style={styles.joinCallText}>Join Call</Text>
                    </TouchableOpacity>
                  ) : null}
                  {upcoming && (
                    <TouchableOpacity
                      style={[styles.calendarBtn, { borderColor: `${colors.deepIndigo}30`, backgroundColor: `${colors.deepIndigo}08` }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        addToDeviceCalendar(b);
                      }}
                      activeOpacity={0.8}
                    >
                      <Feather name="calendar" size={12} color={colors.deepIndigo} />
                      <Text style={[styles.calendarBtnText, { color: colors.deepIndigo }]}>Save to Calendar</Text>
                    </TouchableOpacity>
                  )}
                  {!upcoming && !reviewedIds.has(b.id) && (
                    <TouchableOpacity
                      style={[styles.reviewBtn, { backgroundColor: `${colors.warmGold}18`, borderColor: `${colors.warmGold}40` }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setReviewTarget({
                          bookingId: b.id,
                          practitionerId: b.practitionerId,
                          practitionerName: b.practitionerName,
                          practitionerInitials: b.practitionerInitials,
                          avatarColor: b.avatarColor as [string, string],
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Feather name="star" size={12} color={colors.warmGold} />
                      <Text style={[styles.reviewBtnText, { color: colors.warmGold }]}>Leave a Review</Text>
                    </TouchableOpacity>
                  )}
                  {!upcoming && reviewedIds.has(b.id) && (
                    <View style={[styles.reviewBtn, { backgroundColor: `${colors.deepIndigo}10`, borderColor: `${colors.deepIndigo}20` }]}>
                      <Feather name="check-circle" size={12} color={colors.deepIndigo} />
                      <Text style={[styles.reviewBtnText, { color: colors.deepIndigo }]}>Review submitted</Text>
                    </View>
                  )}
                </View>
                <View style={styles.sessionRight}>
                  <Text style={[styles.sessionPrice, { color: colors.deepIndigo }]}>£{b.price}</Text>
                  <View style={[styles.sessionStatus, { backgroundColor: upcoming ? `${colors.deepIndigo}14` : `${colors.warmGold}18` }]}>
                    <Text style={[styles.sessionStatusText, { color: upcoming ? colors.deepIndigo : colors.warmGold }]}>
                      {upcoming ? "Upcoming" : "Completed"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Saved Practitioners */}
      {favPractitioners.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>SAVED PRACTITIONERS</Text>
          {favPractitioners.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.cream }]}
              onPress={() => router.push(`/practitioner/${p.id}`)}
            >
              <LinearGradient colors={p.avatarColor as [string, string]} style={styles.sessionAvatar}>
                <Text style={styles.sessionInitials}>{p.initials}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sessionName, { color: colors.charcoal }]}>{p.name}</Text>
                <Text style={[styles.sessionMeta, { color: colors.sage, marginTop: 3 }]}>{p.title}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.sage} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Mind & Soul */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>MIND & SOUL</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            style={[styles.mindCard, { backgroundColor: colors.deepIndigo }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/meditation"); }}
            activeOpacity={0.85}
          >
            <Text style={styles.mindIcon}>🧘</Text>
            <Text style={[styles.mindTitle, { color: "#fff" }]}>Meditate</Text>
            <Text style={[styles.mindSub, { color: "rgba(255,255,255,0.6)" }]}>Guided breathing & timer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mindCard, {
              backgroundColor: `${colors.warmGold}12`,
              borderWidth: 1,
              borderColor: `${colors.warmGold}35`,
            }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/journal"); }}
            activeOpacity={0.85}
          >
            <Text style={styles.mindIcon}>📔</Text>
            <Text style={[styles.mindTitle, { color: colors.charcoal }]}>Journal</Text>
            <Text style={[styles.mindSub, { color: colors.sage }]}>Reflect & write freely</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <TouchableOpacity
            style={[styles.mindCard, {
              backgroundColor: `${colors.purpleMid}12`,
              borderWidth: 1,
              borderColor: `${colors.purpleMid}28`,
            }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/gratitude"); }}
            activeOpacity={0.85}
          >
            <Text style={styles.mindIcon}>✨</Text>
            <Text style={[styles.mindTitle, { color: colors.charcoal }]}>Gratitude</Text>
            <Text style={[styles.mindSub, { color: colors.sage }]}>Count your blessings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mindCard, {
              backgroundColor: `${colors.deepIndigo}10`,
              borderWidth: 1,
              borderColor: `${colors.deepIndigo}20`,
            }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/vision-board"); }}
            activeOpacity={0.85}
          >
            <Text style={styles.mindIcon}>🌟</Text>
            <Text style={[styles.mindTitle, { color: colors.charcoal }]}>Vision Board</Text>
            <Text style={[styles.mindSub, { color: colors.sage }]}>Manifest your dreams</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.moodCard, { backgroundColor: colors.deepIndigo }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/mood-tracker"); }}
          activeOpacity={0.85}
        >
          <View style={styles.moodCardLeft}>
            <Text style={styles.moodCardEmojis}>😌 🌟 💜 🌊 😄</Text>
            <Text style={[styles.mindTitle, { color: "#fff", marginTop: 8 }]}>Mood Tracker</Text>
            <Text style={[styles.mindSub, { color: "rgba(255,255,255,0.6)" }]}>Daily check-in & emotional patterns</Text>
          </View>
          <View style={styles.moodCardBadge}>
            <Text style={styles.moodCardBadgeText}>Daily</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.moodCard, { backgroundColor: colors.warmGold, marginTop: 10 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/affirmations"); }}
          activeOpacity={0.85}
        >
          <View style={styles.moodCardLeft}>
            <Text style={styles.moodCardEmojis}>🌸 ✨ 🌿 🔥 🌙</Text>
            <Text style={[styles.mindTitle, { color: "#fff", marginTop: 8 }]}>Affirmations</Text>
            <Text style={[styles.mindSub, { color: "rgba(255,255,255,0.65)" }]}>Daily words that heal & uplift</Text>
          </View>
          <View style={styles.moodCardBadge}>
            <Text style={styles.moodCardBadgeText}>36 total</Text>
          </View>
        </TouchableOpacity>

        {/* Dream Journal */}
        <TouchableOpacity
          style={[styles.moodCard, {
            backgroundColor: colors.deepIndigo,
            marginTop: 10,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/dream-journal"); }}
          activeOpacity={0.85}
        >
          <View style={styles.moodCardLeft}>
            <Text style={styles.moodCardEmojis}>🌙 🌕 🌒 💫 🌑</Text>
            <Text style={[styles.mindTitle, { color: "#fff", marginTop: 8 }]}>Dream Journal</Text>
            <Text style={[styles.mindSub, { color: "rgba(255,255,255,0.6)" }]}>Moon phases · emotions · AI pattern analysis</Text>
          </View>
          <View style={[styles.moodCardBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Text style={[styles.moodCardBadgeText, { color: "#fff" }]}>New</Text>
          </View>
        </TouchableOpacity>

        {/* Period Tracker */}
        <TouchableOpacity
          style={[styles.moodCard, {
            backgroundColor: "#9B4FAB",
            marginTop: 10,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/period-tracker"); }}
          activeOpacity={0.85}
        >
          <View style={styles.moodCardLeft}>
            <Text style={styles.moodCardEmojis}>🌸 🩸 🌺 💜 🌙</Text>
            <Text style={[styles.mindTitle, { color: "#fff", marginTop: 8 }]}>Period Tracker</Text>
            <Text style={[styles.mindSub, { color: "rgba(255,255,255,0.65)" }]}>Cycle · symptoms · predictions</Text>
          </View>
          <View style={[styles.moodCardBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Text style={[styles.moodCardBadgeText, { color: "#fff" }]}>New</Text>
          </View>
        </TouchableOpacity>

        {/* Good Things Today */}
        <TouchableOpacity
          style={[styles.moodCard, {
            backgroundColor: "#D97706",
            marginTop: 10,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/good-things"); }}
          activeOpacity={0.85}
        >
          <View style={styles.moodCardLeft}>
            <Text style={styles.moodCardEmojis}>☀️ 🌟 😊 🌈 ✨</Text>
            <Text style={[styles.mindTitle, { color: "#fff", marginTop: 8 }]}>Good Things Today</Text>
            <Text style={[styles.mindSub, { color: "rgba(255,255,255,0.65)" }]}>Log your daily wins & happy moments</Text>
          </View>
          <View style={[styles.moodCardBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Text style={[styles.moodCardBadgeText, { color: "#fff" }]}>Daily</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Account Menu */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>ACCOUNT</Text>

        {/* Notifications status banner */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.menuCard,
            {
              backgroundColor: notificationsGranted ? colors.card : "#FFF3E0",
              borderColor: notificationsGranted ? colors.cream : "#FFB74D",
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (Platform.OS !== "web") {
              Linking.openSettings();
            }
          }}
        >
          <Feather
            name={notificationsGranted ? "bell" : "bell-off"}
            size={18}
            color={notificationsGranted ? colors.deepIndigo : "#E65100"}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: colors.charcoal }]}>
              {notificationsGranted ? "Notifications enabled" : "Notifications disabled"}
            </Text>
            {!notificationsGranted && (
              <Text style={{ fontSize: 12, color: "#E65100", fontFamily: "Inter_400Regular", marginTop: 2 }}>
                Tap to enable in Settings
              </Text>
            )}
          </View>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: notificationsGranted ? "#4CAF50" : "#FF5722",
            }}
          />
        </TouchableOpacity>

        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                i < MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cream },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (item.route) router.push(item.route as any);
              }}
            >
              <Feather name={item.icon as any} size={18} color={colors.deepIndigo} />
              <Text style={[styles.menuLabel, { color: colors.charcoal }]}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color={colors.sage} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign out / Delete account */}
      <View style={[styles.section, { paddingBottom: 20, gap: 10 }]}>
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.blush }]}
          onPress={handleSignOut}
        >
          <Feather name="log-out" size={16} color={colors.sage} />
          <Text style={[styles.signOutText, { color: colors.sage }]}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: "#e53e3e" }]}
          onPress={handleDeleteAccount}
        >
          <Feather name="trash-2" size={16} color="#e53e3e" />
          <Text style={[styles.signOutText, { color: "#e53e3e" }]}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    <ReviewModal
      target={reviewTarget}
      onClose={() => setReviewTarget(null)}
      onSubmitted={(id) => {
        setReviewedIds((prev) => new Set([...prev, id]));
        setReviewTarget(null);
      }}
    />
    </View>
  );
}

// Minimal Google "G" icon in brand colours
function GoogleColorIcon({ size = 18 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.85, fontFamily: "Inter_700Bold", color: "#4285F4", lineHeight: size }}>
        G
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: "center",
  },
  avatarWrap: {
    marginBottom: 12,
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarPhoto: {
    width: 80,
    height: 80,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarEditOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarText: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  googleBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  profileName: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  profileSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
  },
  stat: { alignItems: "center" },
  statNum: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  // ── Email auth ────────────────────────────────────────────
  authDivider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 14 },
  authDividerLine: { flex: 1, height: 1 },
  authDividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emailBtn: {
    borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 14,
    shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3,
  },
  emailBtnTitle: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  emailBtnSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_400Regular" },
  emailModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  emailModalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  emailModalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  emailModeToggle: { flexDirection: "row", borderRadius: 14, padding: 4, marginBottom: 18 },
  emailModeBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center" },
  emailModeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emailInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 12 },
  passwordRow: { flexDirection: "row", alignItems: "center" },
  emailError: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12, textAlign: "center" },
  emailSubmitBtn: { borderRadius: 14, padding: 15, alignItems: "center", justifyContent: "center", minHeight: 50 },
  emailSubmitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  // ── Google sign-in card ───────────────────────────────────
  googleBtn: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  googleBtnTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  googleBtnSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  // ── Practitioner banner ───────────────────────────────────
  practitionerBanner: {
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerTitle: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  bannerBody: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular", maxWidth: 240 },
  bannerArrow: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  // ── Section ───────────────────────────────────────────────
  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, marginBottom: 12 },
  // ── Session tabs ──────────────────────────────────────────
  tabRow: { flexDirection: "row", borderRadius: 14, padding: 4, marginBottom: 12 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, paddingVertical: 9 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tabBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: "center" },
  tabBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  // ── Empty state ───────────────────────────────────────────
  emptyCard: { borderRadius: 18, borderWidth: 1, padding: 28, alignItems: "center", marginBottom: 8 },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 6, textAlign: "center" },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, marginBottom: 18 },
  emptyBtn: { borderRadius: 12, paddingHorizontal: 22, paddingVertical: 11 },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  // ── Session card ──────────────────────────────────────────
  sessionCard: { borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 },
  sessionAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sessionInitials: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  sessionName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  sessionMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 5, flexWrap: "wrap" },
  sessionMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sessionTagRow: { flexDirection: "row", gap: 6 },
  sessionTag: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 },
  sessionTagText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  joinCallBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 6, alignSelf: "flex-start" },
  calendarBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 4, alignSelf: "flex-start", borderWidth: 1 },
  calendarBtnText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  joinCallText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  reviewBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 6, alignSelf: "flex-start", borderWidth: 1 },
  reviewBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sessionRight: { alignItems: "flex-end", gap: 6, flexShrink: 0 },
  sessionPrice: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sessionStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  sessionStatusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  // ── Practitioner Dashboard ────────────────────────────────
  dashCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  dashRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 0 },
  dashAvatar: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  dashInitials: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  dashName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  dashTitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dashDivider: { height: 1, marginVertical: 14 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  getVerifiedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  getVerifiedTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  getVerifiedSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  subActiveRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, gap: 10 },
  subActiveDot: { width: 10, height: 10, borderRadius: 5 },
  subActiveTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  subActiveSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  subBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  subBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  subActivateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 13,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  subActivateTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  subActivateSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  subArrow: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  payoutsActiveRow: { flexDirection: "row", alignItems: "flex-start" },
  payoutsActiveText: { color: "#38a169", fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  payoutsSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  payoutsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  payoutsBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  dashStats: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  dashStat: { alignItems: "center", flex: 1 },
  dashStatNum: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  dashStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  availabilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 13,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  availabilityBtnText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  // ── Get Featured ──────────────────────────────────────────
  featuredActiveRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 10,
  },
  featuredStar: { fontSize: 20 },
  featuredActiveTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  featuredActiveSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  featuredBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  featuredBtnTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  featuredBtnSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  // ── Account menu ──────────────────────────────────────────
  menuCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  // ── Sign out ──────────────────────────────────────────────
  signOutBtn: { borderRadius: 16, borderWidth: 1.5, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  signOutText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  mindCard: { borderRadius: 18, padding: 18, flex: 1, minHeight: 110 },
  mindIcon: { fontSize: 28, marginBottom: 8 },
  mindTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  mindSub: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  moodCard: { borderRadius: 18, padding: 18, marginTop: 12, flexDirection: "row", alignItems: "center" },
  moodCardLeft: { flex: 1 },
  moodCardEmojis: { fontSize: 22, letterSpacing: 2, marginBottom: 2 },
  moodCardBadge: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  moodCardBadgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  // ── Journey stats ──────────────────────────────────────────
  journeyCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: -18,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  journeyItem: { flex: 1, alignItems: "center" },
  journeyNum: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 2 },
  journeyLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  journeyDivider: { width: 1, height: 28 },
});
