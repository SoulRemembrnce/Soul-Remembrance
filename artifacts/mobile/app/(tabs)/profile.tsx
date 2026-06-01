import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
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

const MENU_ITEMS = [
  { icon: "calendar", label: "My Bookings", route: null },
  { icon: "heart", label: "Saved Practitioners", route: null },
  { icon: "star", label: "My Reviews", route: null },
  { icon: "credit-card", label: "Payment Methods", route: null },
  { icon: "settings", label: "Settings", route: null },
  { icon: "help-circle", label: "Help & Support", route: null },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookings, favorites, userName } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const favPractitioners = PRACTITIONERS.filter((p) => favorites.has(p.id));

  return (
    <ScrollView
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
          <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.avatarText}>AJ</Text>
          </View>
          <TouchableOpacity style={styles.editAvatarBtn}>
            <Feather name="camera" size={12} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.profileName}>{userName} Johnson</Text>
        <Text style={styles.profileSub}>Soul Seeker · Member since 2024</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{bookings.length}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{favorites.size}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>3</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Become a Practitioner */}
      <View style={{ padding: 20 }}>
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

      {/* Recent Bookings */}
      {bookings.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>RECENT BOOKINGS</Text>
          {bookings.slice(0, 2).map((b) => (
            <View
              key={b.id}
              style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.cream }]}
            >
              <LinearGradient colors={b.avatarColor as [string, string]} style={styles.bookingAvatar}>
                <Text style={styles.bookingInitials}>{b.practitionerInitials}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bookingName, { color: colors.charcoal }]}>{b.practitionerName}</Text>
                <Text style={[styles.bookingMeta, { color: colors.sage }]}>
                  {b.date} at {b.time}
                </Text>
              </View>
              <View style={[styles.bookingStatus, { backgroundColor: colors.cream }]}>
                <Text style={[styles.bookingStatusText, { color: colors.deepIndigo }]}>Confirmed</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Saved Practitioners */}
      {favPractitioners.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>SAVED PRACTITIONERS</Text>
          {favPractitioners.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.cream }]}
              onPress={() => router.push(`/practitioner/${p.id}`)}
            >
              <LinearGradient colors={p.avatarColor as [string, string]} style={styles.bookingAvatar}>
                <Text style={styles.bookingInitials}>{p.initials}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bookingName, { color: colors.charcoal }]}>{p.name}</Text>
                <Text style={[styles.bookingMeta, { color: colors.sage }]}>{p.title}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.sage} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Menu */}
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
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Feather name="log-out" size={16} color={colors.sage} />
          <Text style={[styles.signOutText, { color: colors.sage }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  avatarText: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
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
  stat: {
    alignItems: "center",
  },
  statNum: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  practitionerBanner: {
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  bannerBody: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    maxWidth: 240,
  },
  bannerArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  bookingCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  bookingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bookingInitials: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  bookingName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  bookingMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  bookingStatus: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bookingStatusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  signOutBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
