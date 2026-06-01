import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";

import { Practitioner } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

interface Props {
  practitioners: Practitioner[];
  selected: Practitioner | null;
  onSelect: (p: Practitioner | null) => void;
  initialRegion: Region;
  bottomPad: number;
}

export default function PractitionerMap({ practitioners, selected, onSelect, initialRegion, bottomPad }: Props) {
  const colors = useColors();
  const mapRef = useRef<MapView>(null);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsCompass={false}
        showsScale={false}
      >
        {practitioners.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lon }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(p);
            }}
          >
            <View
              style={[
                styles.markerPin,
                { backgroundColor: selected?.id === p.id ? colors.gold : colors.deepIndigo },
              ]}
            >
              <Text style={styles.markerText}>{p.initials}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Count badge */}
      <View style={[styles.countBadge, { backgroundColor: colors.deepIndigo }]}>
        <Feather name="users" size={12} color="rgba(255,255,255,0.85)" />
        <Text style={styles.countText}>
          {practitioners.length} practitioner{practitioners.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Bottom card */}
      {selected && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cream, paddingBottom: bottomPad + 14 }]}>
          <View style={styles.cardHandle}>
            <View style={[styles.handleBar, { backgroundColor: colors.blush }]} />
          </View>
          <View style={styles.cardContent}>
            <LinearGradient colors={selected.avatarColor as [string, string]} style={styles.cardAvatar}>
              <Text style={styles.cardInitials}>{selected.initials}</Text>
            </LinearGradient>
            <View style={styles.cardInfo}>
              <View style={styles.cardNameRow}>
                <Text style={[styles.cardName, { color: colors.charcoal }]}>{selected.name}</Text>
                {selected.verified && <Feather name="check-circle" size={13} color={colors.deepIndigo} />}
              </View>
              <Text style={[styles.cardTitle, { color: colors.sage }]}>{selected.title}</Text>
              <View style={styles.cardMeta}>
                <Feather name="map-pin" size={11} color={colors.sage} />
                <Text style={[styles.cardLocation, { color: colors.sage }]}>{selected.location}</Text>
                <View style={[styles.dot, { backgroundColor: colors.blush }]} />
                <Text style={[styles.cardRating, { color: colors.gold }]}>★ {selected.rating}</Text>
                <View style={[styles.dot, { backgroundColor: colors.blush }]} />
                <Text style={[styles.cardPrice, { color: colors.purpleMid }]}>£{selected.price}</Text>
              </View>
              <View style={styles.cardTags}>
                {selected.tags.slice(0, 2).map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.cream }]}>
                    <Text style={[styles.tagText, { color: colors.deepIndigo }]}>{tag}</Text>
                  </View>
                ))}
                {selected.online && (
                  <View style={[styles.tag, { backgroundColor: "#EEE5FF" }]}>
                    <Feather name="monitor" size={9} color={colors.deepIndigo} />
                    <Text style={[styles.tagText, { color: colors.deepIndigo, marginLeft: 2 }]}>Online</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => onSelect(null)}
              style={[styles.dismissBtn, { borderColor: colors.blush }]}
            >
              <Feather name="x" size={16} color={colors.sage} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(`/practitioner/${selected.id}`);
              }}
              style={[styles.bookBtn, { backgroundColor: colors.deepIndigo }]}
            >
              <Text style={styles.bookBtnText}>View Profile & Book</Text>
              <Feather name="arrow-right" size={15} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tap-hint */}
      {!selected && practitioners.length > 0 && (
        <View style={[styles.hint, { backgroundColor: `${colors.deepIndigo}E8` }]}>
          <Feather name="info" size={13} color="rgba(255,255,255,0.8)" />
          <Text style={styles.hintText}>Tap a pin to see practitioner details</Text>
        </View>
      )}

      {/* Empty */}
      {practitioners.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
          <Feather name="search" size={24} color={colors.blush} />
          <Text style={[styles.emptyText, { color: colors.charcoal }]}>No practitioners in this area</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  markerPin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  markerText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  countBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  countText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  card: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 16,
    elevation: 12,
  },
  cardHandle: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    gap: 14,
    marginBottom: 12,
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardInitials: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  cardInfo: { flex: 1 },
  cardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  cardName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 5,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 7,
    flexWrap: "wrap",
  },
  cardLocation: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  cardRating: { fontSize: 13, fontFamily: "Inter_700Bold" },
  cardPrice: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cardTags: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  dismissBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bookBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  hint: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  hintText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  emptyCard: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
