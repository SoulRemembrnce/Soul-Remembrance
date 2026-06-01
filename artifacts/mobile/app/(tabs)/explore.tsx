import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FILTER_MODALITIES, PRACTITIONERS, Practitioner } from "@/constants/data";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite } = useApp();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"rating" | "price">("rating");
  const [onlineOnly, setOnlineOnly] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filtered = useMemo(() => {
    return PRACTITIONERS.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchFilter =
        activeFilter === "All" ||
        p.tags.some((t) => t.toLowerCase().includes(activeFilter.toLowerCase())) ||
        p.modalities.some((m) => m.toLowerCase().includes(activeFilter.toLowerCase()));
      const matchOnline = !onlineOnly || p.online;
      return matchSearch && matchFilter && matchOnline;
    }).sort((a, b) => (sortBy === "rating" ? b.rating - a.rating : a.price - b.price));
  }, [search, activeFilter, sortBy, onlineOnly]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <Text style={styles.headerTitle}>Explore</Text>
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { flex: 1 }]}>
            <Feather name="search" size={15} color="rgba(255,255,255,0.5)" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Practitioners, modalities..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={14} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.cream }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {FILTER_MODALITIES.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => {
                setActiveFilter(f);
                Haptics.selectionAsync();
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === f ? colors.deepIndigo : colors.cream,
                  marginRight: 8,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: activeFilter === f ? "#fff" : colors.charcoal },
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort + online toggle */}
      <View style={[styles.sortBar, { backgroundColor: colors.softWhite }]}>
        <View style={styles.sortBtns}>
          {([["rating", "Top Rated"], ["price", "Price"]] as const).map(([val, label]) => (
            <TouchableOpacity
              key={val}
              onPress={() => setSortBy(val)}
              style={[
                styles.sortBtn,
                {
                  backgroundColor: sortBy === val ? `${colors.deepIndigo}18` : colors.card,
                  borderColor: sortBy === val ? colors.deepIndigo : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.sortBtnText,
                  { color: sortBy === val ? colors.deepIndigo : colors.sage },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={() => {
            setOnlineOnly((v) => !v);
            Haptics.selectionAsync();
          }}
          style={styles.toggleRow}
        >
          <View
            style={[
              styles.toggle,
              { backgroundColor: onlineOnly ? colors.deepIndigo : colors.blush },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                { transform: [{ translateX: onlineOnly ? 16 : 2 }] },
              ]}
            />
          </View>
          <Text style={[styles.toggleLabel, { color: colors.charcoal }]}>Online</Text>
        </TouchableOpacity>
      </View>

      {/* Practitioner list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="search" size={40} color={colors.blush} />
            <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>No practitioners found</Text>
            <Text style={[styles.emptyBody, { color: colors.sage }]}>Try adjusting your search or filters</Text>
          </View>
        }
        renderItem={({ item: p }) => (
          <TouchableOpacity
            style={[styles.practCard, { backgroundColor: colors.card, borderColor: colors.cream }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/practitioner/${p.id}`);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.deepIndigo, colors.lavenderMid]}
              style={styles.practHeader}
            >
              <View style={styles.practHeaderInner}>
                <LinearGradient colors={p.avatarColor as [string, string]} style={styles.practAvatar}>
                  <Text style={styles.practInitials}>{p.initials}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.practName}>{p.name}</Text>
                    {p.verified && (
                      <View style={[styles.verifiedBadge, { backgroundColor: colors.gold }]}>
                        <Text style={styles.verifiedText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.practTitleText}>{p.title}</Text>
                  <Text style={styles.practLocation}>
                    {p.location}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.practRating, { color: colors.gold }]}>★ {p.rating}</Text>
                  <Text style={styles.practPriceText}>£{p.price}</Text>
                </View>
              </View>
            </LinearGradient>
            <View style={styles.practBody}>
              <View style={styles.tagsRow}>
                {p.tags.map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.cream }]}>
                    <Text style={[styles.tagText, { color: colors.deepIndigo }]}>{tag}</Text>
                  </View>
                ))}
                {p.online && (
                  <View style={[styles.tag, { backgroundColor: "#EEE5FF" }]}>
                    <Feather name="monitor" size={10} color={colors.deepIndigo} />
                    <Text style={[styles.tagText, { color: colors.deepIndigo, marginLeft: 3 }]}>Online</Text>
                  </View>
                )}
              </View>
              <View style={styles.practFooter}>
                <Text style={[styles.nextAvail, { color: colors.sage }]}>
                  Next:{" "}
                  <Text
                    style={{
                      color: p.nextAvail === "Today" ? colors.deepIndigo : colors.charcoal,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    {p.nextAvail}
                  </Text>
                </Text>
                <TouchableOpacity onPress={() => toggleFavorite(p.id)}>
                  <Feather
                    name="heart"
                    size={16}
                    color={favorites.has(p.id) ? "#E55" : colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
  },
  searchBox: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  filterBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  sortBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortBtns: {
    flexDirection: "row",
    gap: 8,
  },
  sortBtn: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  sortBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  toggleLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  practCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  practHeader: {
    padding: 16,
  },
  practHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  practAvatar: {
    width: 54,
    height: 54,
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  practName: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  verifiedBadge: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  verifiedText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  practTitleText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  practLocation: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  practRating: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  practPriceText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  practBody: {
    padding: 14,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  practFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nextAvail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
