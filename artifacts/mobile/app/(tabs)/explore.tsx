import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PractitionerMap from "@/components/PractitionerMap";
import { FILTER_MODALITIES, Practitioner, PRACTITIONERS } from "@/constants/data";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const LOCATION_PRESETS = [
  { label: "All", city: "" },
  { label: "London", city: "London" },
  { label: "Sedona", city: "Sedona" },
  { label: "Portland", city: "Portland" },
  { label: "Boulder", city: "Boulder" },
  { label: "Glastonbury", city: "Glastonbury" },
  { label: "Brighton", city: "Brighton" },
];

const WORLD_REGION = {
  latitude: 45,
  longitude: -30,
  latitudeDelta: 60,
  longitudeDelta: 90,
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite } = useApp();

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeLocation, setActiveLocation] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [sortBy, setSortBy] = useState<"rating" | "price">("rating");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);

  // Near Me state
  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleNearMe = async () => {
    if (nearMeActive) {
      // Toggle off
      setNearMeActive(false);
      setUserLocation(null);
      setLocationError("");
      Haptics.selectionAsync();
      return;
    }

    setNearMeLoading(true);
    setLocationError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission denied");
        setNearMeLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setNearMeActive(true);
      setActiveLocation("");
      setLocationSearch("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setLocationError("Couldn't get your location");
    } finally {
      setNearMeLoading(false);
    }
  };

  type PractitionerWithDist = Practitioner & { distKm?: number };

  const filtered = useMemo((): PractitionerWithDist[] => {
    const loc = locationSearch.trim().toLowerCase() || activeLocation.toLowerCase();
    let list: PractitionerWithDist[] = PRACTITIONERS.filter((p) => {
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
      const matchLoc =
        !loc ||
        p.city.toLowerCase().includes(loc) ||
        p.country.toLowerCase().includes(loc) ||
        p.location.toLowerCase().includes(loc);
      return matchSearch && matchFilter && matchOnline && matchLoc;
    });

    if (nearMeActive && userLocation) {
      list = list.map((p) => ({
        ...p,
        distKm: haversineKm(userLocation.lat, userLocation.lon, p.lat, p.lon),
      }));
      list.sort((a, b) => (a.distKm ?? 0) - (b.distKm ?? 0));
    } else {
      list.sort((a, b) => (sortBy === "rating" ? b.rating - a.rating : a.price - b.price));
    }

    return list;
  }, [search, activeFilter, sortBy, onlineOnly, locationSearch, activeLocation, nearMeActive, userLocation]);

  const userRegion = userLocation
    ? { latitude: userLocation.lat, longitude: userLocation.lon, latitudeDelta: 8, longitudeDelta: 8 }
    : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Explore</Text>
          <View style={styles.headerActions}>
            {/* Near Me button */}
            <TouchableOpacity
              onPress={handleNearMe}
              style={[
                styles.nearMeBtn,
                {
                  backgroundColor: nearMeActive
                    ? colors.gold
                    : "rgba(255,255,255,0.18)",
                  borderColor: nearMeActive ? colors.gold : "rgba(255,255,255,0.3)",
                },
              ]}
            >
              {nearMeLoading ? (
                <ActivityIndicator size={13} color="#fff" />
              ) : (
                <Feather
                  name="navigation"
                  size={13}
                  color={nearMeActive ? colors.deepIndigo : "#fff"}
                />
              )}
              <Text
                style={[
                  styles.nearMeTxt,
                  { color: nearMeActive ? colors.deepIndigo : "#fff" },
                ]}
              >
                {nearMeActive ? "Near Me ✓" : "Near Me"}
              </Text>
            </TouchableOpacity>

            {/* List / Map toggle */}
            <View style={styles.viewToggle}>
              {(["list", "map"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => {
                    setViewMode(mode);
                    setSelectedPractitioner(null);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.viewToggleBtn,
                    { backgroundColor: viewMode === mode ? "#fff" : "transparent" },
                  ]}
                >
                  <Feather
                    name={mode === "list" ? "list" : "map"}
                    size={14}
                    color={viewMode === mode ? colors.deepIndigo : "rgba(255,255,255,0.75)"}
                  />
                  <Text
                    style={[
                      styles.viewToggleTxt,
                      { color: viewMode === mode ? colors.deepIndigo : "rgba(255,255,255,0.75)" },
                    ]}
                  >
                    {mode === "list" ? "List" : "Map"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Location error */}
        {locationError.length > 0 && (
          <View style={[styles.errorBanner, { backgroundColor: "rgba(255,80,80,0.18)" }]}>
            <Feather name="alert-circle" size={13} color="#ffaaaa" />
            <Text style={styles.errorText}>{locationError}</Text>
          </View>
        )}

        {/* Near Me active banner */}
        {nearMeActive && userLocation && (
          <View style={[styles.nearMeBanner, { backgroundColor: "rgba(201,168,76,0.18)" }]}>
            <Feather name="navigation" size={13} color={colors.gold} />
            <Text style={[styles.nearMeBannerText, { color: colors.gold }]}>
              Sorted by distance from your location
            </Text>
          </View>
        )}

        {/* Keyword search */}
        <View style={[styles.searchBox, { marginBottom: 8 }]}>
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

        {/* Location search */}
        <View style={styles.searchBox}>
          <Feather name="map-pin" size={15} color="rgba(255,255,255,0.5)" />
          <TextInput
            value={locationSearch}
            onChangeText={(v) => {
              setLocationSearch(v);
              setActiveLocation("");
              if (v.length > 0) {
                setNearMeActive(false);
                setUserLocation(null);
              }
            }}
            placeholder="Search by city or country..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {locationSearch.length > 0 && (
            <TouchableOpacity onPress={() => setLocationSearch("")}>
              <Feather name="x" size={14} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Location preset chips */}
      <View style={[styles.locBar, { backgroundColor: colors.card, borderBottomColor: colors.cream }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14 }}
        >
          {LOCATION_PRESETS.map(({ label, city }) => {
            const isActive = !nearMeActive && activeLocation === city && !locationSearch;
            return (
              <TouchableOpacity
                key={label}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveLocation(city);
                  setLocationSearch("");
                  setNearMeActive(false);
                  setUserLocation(null);
                }}
                style={[
                  styles.locChip,
                  { backgroundColor: isActive ? colors.deepIndigo : colors.cream, marginRight: 8 },
                ]}
              >
                {label !== "All" && (
                  <Feather
                    name="map-pin"
                    size={10}
                    color={isActive ? "rgba(255,255,255,0.8)" : colors.sage}
                  />
                )}
                <Text style={[styles.locChipText, { color: isActive ? "#fff" : colors.charcoal }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Modality filters — list only */}
      {viewMode === "list" && (
        <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.cream }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {FILTER_MODALITIES.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => { setActiveFilter(f); Haptics.selectionAsync(); }}
                style={[
                  styles.filterChip,
                  { backgroundColor: activeFilter === f ? colors.deepIndigo : colors.cream, marginRight: 8 },
                ]}
              >
                <Text style={[styles.filterChipText, { color: activeFilter === f ? "#fff" : colors.charcoal }]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Sort + online toggle — list only */}
      {viewMode === "list" && (
        <View style={[styles.sortBar, { backgroundColor: colors.softWhite }]}>
          {!nearMeActive && (
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
                  <Text style={[styles.sortBtnText, { color: sortBy === val ? colors.deepIndigo : colors.sage }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {nearMeActive && (
            <View style={[styles.sortBtns]}>
              <View style={[styles.sortBtn, { backgroundColor: `${colors.gold}20`, borderColor: colors.gold }]}>
                <Feather name="navigation" size={11} color={colors.gold} />
                <Text style={[styles.sortBtnText, { color: colors.gold }]}>Nearest first</Text>
              </View>
            </View>
          )}
          <Text style={[styles.resultsText, { color: colors.sage }]}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </Text>
          <TouchableOpacity
            onPress={() => { setOnlineOnly((v) => !v); Haptics.selectionAsync(); }}
            style={styles.toggleRow}
          >
            <View style={[styles.toggle, { backgroundColor: onlineOnly ? colors.deepIndigo : colors.blush }]}>
              <View style={[styles.toggleThumb, { transform: [{ translateX: onlineOnly ? 16 : 2 }] }]} />
            </View>
            <Text style={[styles.toggleLabel, { color: colors.charcoal }]}>Online</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* === MAP VIEW === */}
      {viewMode === "map" && (
        <PractitionerMap
          practitioners={filtered}
          selected={selectedPractitioner}
          onSelect={setSelectedPractitioner}
          initialRegion={WORLD_REGION}
          userRegion={userRegion}
          bottomPad={bottomPad}
        />
      )}

      {/* === LIST VIEW === */}
      {viewMode === "list" && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 80 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="search" size={40} color={colors.blush} />
              <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>No practitioners found</Text>
              <Text style={[styles.emptyBody, { color: colors.sage }]}>
                Try adjusting your search or filters
              </Text>
              {(activeLocation || locationSearch || nearMeActive) && (
                <TouchableOpacity
                  onPress={() => {
                    setActiveLocation("");
                    setLocationSearch("");
                    setNearMeActive(false);
                    setUserLocation(null);
                  }}
                  style={[styles.clearBtn, { backgroundColor: colors.cream }]}
                >
                  <Text style={[styles.clearBtnText, { color: colors.deepIndigo }]}>Clear location</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item: p }) => {
            const dist = (p as Practitioner & { distKm?: number }).distKm;
            return (
              <TouchableOpacity
                style={[styles.practCard, { backgroundColor: colors.card, borderColor: colors.cream }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/practitioner/${p.id}`);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[colors.deepIndigo, colors.lavenderMid]} style={styles.practHeader}>
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
                      <View style={styles.locationRow}>
                        <Feather name="map-pin" size={10} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.practLocation}>{p.location}</Text>
                        {dist !== undefined && (
                          <>
                            <Text style={styles.practLocationDot}>·</Text>
                            <Feather name="navigation" size={9} color={colors.gold} />
                            <Text style={[styles.practDist, { color: colors.gold }]}>
                              {formatDist(dist)}
                            </Text>
                          </>
                        )}
                      </View>
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
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nearMeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
  },
  nearMeTxt: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 3,
  },
  viewToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewToggleTxt: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  nearMeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  nearMeBannerText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  errorText: {
    color: "#ffaaaa",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  searchBox: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 0,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  locBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  locChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  locChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
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
    paddingVertical: 9,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sortBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  resultsText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
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
  clearBtn: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  clearBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
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
  practHeader: { padding: 16 },
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
    fontSize: 17,
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
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
    flexWrap: "wrap",
  },
  practLocation: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  practLocationDot: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
  },
  practDist: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
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
  practBody: { padding: 14 },
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
