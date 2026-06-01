import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PRACTITIONERS } from "@/constants/data";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  FSPractitionerProfile,
  subscribePractitionerProfile,
  updatePractitionerStripeAccount,
  updatePractitionerSubscription,
} from "@/lib/firestore";

const MENU_ITEMS = [
  { icon: "credit-card", label: "Payment Methods", route: null },
  { icon: "settings", label: "Settings", route: null },
  { icon: "help-circle", label: "Help & Support", route: null },
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
    bookings, favorites, userReviews,
    isAnonymous, displayName, email, photoURL,
    signInWithGoogle, signOut, userId,
  } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const sessionsY = useRef(0);

  const [sessionTab, setSessionTab] = useState<"upcoming" | "past">("upcoming");
  const [myProfile, setMyProfile] = useState<FSPractitionerProfile | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const pendingSessionIdRef = useRef<string | null>(null);

  // Subscribe to own practitioner profile (if user is a practitioner)
  useEffect(() => {
    if (!userId) return;
    return subscribePractitionerProfile(userId, setMyProfile);
  }, [userId]);

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
      Alert.alert("Setup Error", err.message ?? "Something went wrong. Please try again.");
    } finally {
      setConnectLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const favPractitioners = PRACTITIONERS.filter((p) => favorites.has(p.id));
  const upcomingBookings = bookings.filter((b) => isUpcoming(b.date));
  const pastBookings = bookings.filter((b) => !isUpcoming(b.date));
  const shownBookings = sessionTab === "upcoming" ? upcomingBookings : pastBookings;
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

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.softWhite }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.avatarWrap}>
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
          {!isAnonymous && (
            <View style={[styles.googleBadge, { backgroundColor: "#fff" }]}>
              <GoogleColorIcon size={12} />
            </View>
          )}
        </View>

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

      {/* Sign in with Google — shown only when anonymous */}
      {isAnonymous && (
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <TouchableOpacity
            style={[styles.googleBtn, { backgroundColor: colors.card, borderColor: colors.cream }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              signInWithGoogle();
            }}
            activeOpacity={0.85}
          >
            <GoogleColorIcon size={20} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.googleBtnTitle, { color: colors.charcoal }]}>
                Continue with Google
              </Text>
              <Text style={[styles.googleBtnSub, { color: colors.sage }]}>
                Save your bookings and favourites across devices
              </Text>
            </View>
            <Feather name="arrow-right" size={16} color={colors.sage} />
          </TouchableOpacity>
        </View>
      )}

      {/* Practitioner Dashboard — shown when user is a practitioner */}
      {myProfile && !isAnonymous && (
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Text style={[styles.sectionLabel, { color: colors.warmGold, marginBottom: 12 }]}>
            PRACTITIONER DASHBOARD
          </Text>
          <View style={[styles.dashCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
            {/* Profile row */}
            <View style={styles.dashRow}>
              <LinearGradient
                colors={myProfile.avatarColor as [string, string]}
                style={styles.dashAvatar}
              >
                <Text style={styles.dashInitials}>{myProfile.initials}</Text>
              </LinearGradient>
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
                    97.5% of each session paid to you automatically
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
                    <Feather name="dollar-sign" size={16} color="#fff" />
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
          </View>
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

      {/* Account Menu */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>ACCOUNT</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                i < MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cream },
              ]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Feather name={item.icon as any} size={18} color={colors.deepIndigo} />
              <Text style={[styles.menuLabel, { color: colors.charcoal }]}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color={colors.sage} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign out */}
      <View style={[styles.section, { paddingBottom: 20 }]}>
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.blush }]}
          onPress={handleSignOut}
        >
          <Feather name="log-out" size={16} color={colors.sage} />
          <Text style={[styles.signOutText, { color: colors.sage }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  joinCallText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
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
  // ── Account menu ──────────────────────────────────────────
  menuCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  // ── Sign out ──────────────────────────────────────────────
  signOutBtn: { borderRadius: 16, borderWidth: 1.5, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  signOutText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
