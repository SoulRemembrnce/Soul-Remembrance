import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Region } from "react-native-maps";

import { Practitioner } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

interface Props {
  practitioners: Practitioner[];
  selected: Practitioner | null;
  onSelect: (p: Practitioner | null) => void;
  initialRegion: Region;
  bottomPad: number;
}

export default function PractitionerMap({ practitioners, selected, onSelect, bottomPad }: Props) {
  const colors = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      {/* Web fallback: styled list with location context */}
      <View style={[styles.mapFallbackBanner, { backgroundColor: `${colors.deepIndigo}12`, borderBottomColor: colors.blush }]}>
        <Feather name="map" size={15} color={colors.deepIndigo} />
        <Text style={[styles.fallbackText, { color: colors.deepIndigo }]}>
          Map view available on iOS & Android via Expo Go
        </Text>
      </View>

      <FlatList
        data={practitioners}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 80 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="search" size={40} color={colors.blush} />
            <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>No practitioners found</Text>
          </View>
        }
        renderItem={({ item: p }) => (
          <TouchableOpacity
            style={[
              styles.card,
              {
                backgroundColor: selected?.id === p.id ? `${colors.deepIndigo}10` : colors.card,
                borderColor: selected?.id === p.id ? colors.deepIndigo : colors.cream,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/practitioner/${p.id}`);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={p.avatarColor as [string, string]} style={styles.avatar}>
              <Text style={styles.initials}>{p.initials}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.charcoal }]}>{p.name}</Text>
                {p.verified && <Feather name="check-circle" size={12} color={colors.deepIndigo} />}
              </View>
              <Text style={[styles.title, { color: colors.sage }]}>{p.title}</Text>
              <View style={styles.metaRow}>
                <Feather name="map-pin" size={11} color={colors.sage} />
                <Text style={[styles.location, { color: colors.sage }]}>{p.location}</Text>
                <Text style={[styles.rating, { color: colors.gold }]}>★ {p.rating}</Text>
                <Text style={[styles.price, { color: colors.purpleMid }]}>£{p.price}</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={colors.sage} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapFallbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  fallbackText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  card: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  initials: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  title: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  location: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  rating: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  price: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
