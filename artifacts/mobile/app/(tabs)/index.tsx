import { AshTreeBackground } from "@/components/AshTreeBackground";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { EVENTS } from "@/constants/data";
import { useColors } from "@/hooks/useColors";
import {
  FSPractitionerProfile,
  profileToPractitioner,
  subscribePractitionerProfiles,
} from "@/lib/firestore";

const MODALITY_CHIPS = ["All", "Sound", "Breath", "Reiki", "Somatic", "Ayurveda", "Meditation"];

/** Returns a display badge like "TONIGHT • 7PM", "TOMORROW • 10AM", or "JUN 3 • 2PM" */
function eventBadge(dateISO: string, time: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const evDate = new Date(dateISO + "T00:00:00");
  const diff = Math.round((evDate.getTime() - today.getTime()) / 86400000);
  const t = time.toUpperCase();
  if (diff === 0) return `TONIGHT • ${t}`;
  if (diff === 1) return `TOMORROW • ${t}`;
  return `${evDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" }).toUpperCase()} • ${t}`;
}

/** Events within the next 7 days (today inclusive), sorted earliest first */
function getUpcomingEvents() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 7);
  return EVENTS
    .filter((ev) => {
      const d = new Date(ev.dateISO + "T00:00:00");
      return d >= today && d <= cutoff;
    })
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userName, favorites, toggleFavorite } = useApp();
  const [activeModality, setActiveModality] = useState("All");
  const [realProfiles, setRealProfiles] = useState<FSPractitionerProfile[]>([]);

  useEffect(() => {
    return subscribePractitionerProfiles(setRealProfiles);
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const upcomingEvents = useMemo(getUpcomingEvents, []);
  const featured = upcomingEvents[0] ?? null;
  const allPractitioners = [...realProfiles]
    .sort((a, b) => (a.verified === b.verified ? 0 : a.verified ? -1 : 1))
    .map(profileToPractitioner);
  const now = Date.now();
  const featuredPractitioners = realProfiles
    .filter((p) => p.featuredUntil && p.featuredUntil.toMillis() > now)
    .map(profileToPractitioner)
    .slice(0, 6);

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <AshTreeBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerEyebrow}>SOUL REMEMBRANCE</Text>
            <Text style={styles.headerTitle}>Welcome, {userName}</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
            <Feather name="bell" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push("/(tabs)/explore")}
          activeOpacity={0.8}
        >
          <Feather name="search" size={16} color="rgba(255,255,255,0.5)" />
          <Text style={styles.searchPlaceholder}>Search healers, retreats, workshops...</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Modality chips */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>EXPLORE BY MODALITY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {MODALITY_CHIPS.map((chip, i) => (
            <TouchableOpacity
              key={chip}
              onPress={() => {
                setActiveModality(chip);
                Haptics.selectionAsync();
                if (chip !== "All") router.push("/(tabs)/explore");
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: activeModality === chip ? colors.deepIndigo : colors.cream,
                  borderColor: activeModality === chip ? colors.deepIndigo : colors.blush,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: activeModality === chip ? "#fff" : colors.charcoal },
                ]}
              >
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Featured Event — only shown when an event exists */}
      {featured && <View style={styles.sectionPad}>
        <LinearGradient
          colors={[colors.purpleMid, "#5A3A9A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featuredCard}
        >
          <View style={styles.featuredInner}>
            <View
              style={[
                styles.featuredBadge,
                { backgroundColor: "rgba(255,255,255,0.2)" },
              ]}
            >
              <Text style={styles.featuredBadgeText}>{eventBadge(featured.dateISO, featured.time)}</Text>
            </View>
            <Text style={styles.featuredTitle}>{featured.title}</Text>
            <Text style={styles.featuredSub}>with {featured.host} • {featured.location}</Text>
            <View style={styles.featuredFooter}>
              <View style={styles.featuredAlert}>
                <Feather name="zap" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.featuredAlertText}>Only {featured.spots} spots left</Text>
              </View>
              <TouchableOpacity
                style={styles.featuredBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Text style={[styles.featuredBtnText, { color: colors.purpleMid }]}>
                  Reserve {featured.price}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>}

      {/* Featured Practitioners */}
      <View style={styles.sectionPad}>
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>FEATURED PRACTITIONERS</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/explore")}>
            <Text style={[styles.seeAll, { color: colors.purpleMid }]}>See all</Text>
          </TouchableOpacity>
        </View>
        {featuredPractitioners.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.practCard, { backgroundColor: colors.card, borderColor: colors.cream }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/practitioner/${p.id}`);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={p.avatarColor as [string, string]}
              style={styles.practAvatar}
            >
              <Text style={styles.practInitials}>{p.initials}</Text>
            </LinearGradient>
            <View style={styles.practInfo}>
              <View style={styles.practNameRow}>
                <Text style={[styles.practName, { color: colors.charcoal }]}>{p.name}</Text>
                {p.verified && (
                  <Feather name="check-circle" size={13} color={colors.deepIndigo} />
                )}
              </View>
              <Text style={[styles.practTitle, { color: colors.sage }]}>{p.title}</Text>
              <View style={styles.tagsRow}>
                {p.tags.slice(0, 2).map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.cream }]}>
                    <Text style={[styles.tagText, { color: colors.deepIndigo }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.practRight}>
              <Text style={[styles.practRating, { color: colors.gold }]}>★ {p.rating}</Text>
              <Text style={[styles.practPrice, { color: colors.purpleMid }]}>£{p.price}</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleFavorite(p.id);
                }}
              >
                <Feather
                  name={favorites.has(p.id) ? "heart" : "heart"}
                  size={16}
                  color={favorites.has(p.id) ? "#E55" : colors.mutedForeground}
                  style={{ marginTop: 6 }}
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Upcoming Events */}
      <View style={styles.sectionPad}>
        <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>UPCOMING EVENTS</Text>
        {upcomingEvents.length === 0 ? (
          <View style={[styles.evEmpty, { backgroundColor: colors.card, borderColor: colors.cream }]}>
            <Feather name="calendar" size={28} color={colors.sage} style={{ marginBottom: 8 }} />
            <Text style={[styles.evEmptyTitle, { color: colors.charcoal }]}>Nothing in the next 7 days</Text>
            <Text style={[styles.evEmptyBody, { color: colors.sage }]}>Check back soon — new events are added regularly.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {upcomingEvents.map((ev) => (
              <TouchableOpacity
                key={ev.id}
                activeOpacity={0.85}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <LinearGradient
                  colors={ev.color as [string, string]}
                  style={styles.evCard}
                >
                  <View style={[styles.evTypeBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                    <Text style={styles.evTypeText}>{eventBadge(ev.dateISO, ev.time)}</Text>
                  </View>
                  <Text style={styles.evTitle} numberOfLines={2}>{ev.title}</Text>
                  <Text style={styles.evHost}>with {ev.host}</Text>
                  <View style={styles.evFooter}>
                    <Text style={styles.evDate}>{ev.date}</Text>
                    <Text style={styles.evPrice}>{ev.price}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  headerEyebrow: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchPlaceholder: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionPad: {
    marginTop: 22,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  chipsScroll: {
    marginHorizontal: -4,
  },
  chip: {
    borderRadius: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  featuredCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  featuredInner: {
    padding: 20,
  },
  featuredBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  featuredBadgeText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  featuredSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  featuredFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  featuredAlertText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  featuredBtn: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  featuredBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  practCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  practAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  practInitials: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  practInfo: {
    flex: 1,
  },
  practNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  practName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  practTitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
    marginBottom: 5,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 5,
    flexWrap: "wrap",
  },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  practRight: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  practRating: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  practPrice: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginTop: 3,
  },
  evCard: {
    width: 200,
    borderRadius: 18,
    padding: 16,
    marginRight: 12,
  },
  evTypeBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  evTypeText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  evTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
    lineHeight: 22,
  },
  evHost: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  evFooter: {
    gap: 2,
  },
  evDate: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  evPrice: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  evEmpty: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginTop: 4,
  },
  evEmptyTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
    textAlign: "center",
  },
  evEmptyBody: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
