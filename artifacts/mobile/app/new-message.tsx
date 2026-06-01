import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  FSPractitionerProfile,
  createConversation,
  subscribePractitioners,
} from "@/lib/firestore";

export default function NewMessageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();

  const [practitioners, setPractitioners] = useState<FSPractitionerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [starting, setStarting] = useState<number | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    const unsub = subscribePractitioners((pracs) => {
      setPractitioners(pracs);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = practitioners.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      (p.city ?? "").toLowerCase().includes(q)
    );
  });

  async function startConversation(p: FSPractitionerProfile) {
    if (!userId) return;
    setStarting(p.numericId);
    try {
      const convId = await createConversation(
        userId,
        p.numericId,
        p.name,
        p.initials,
        p.avatarColor
      );
      router.replace(`/chat/${convId}` as any);
    } catch {
      setStarting(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="x" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Message</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search practitioners…"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x-circle" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {!query.trim() ? (
        <View style={styles.centred}>
          <Feather name="search" size={40} color={colors.blush} />
          <Text style={[styles.emptyText, { color: colors.sage }]}>
            Search for a practitioner by name, specialty, or location
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.centred}>
          <ActivityIndicator color={colors.deepIndigo} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centred}>
          <Feather name="user-x" size={40} color={colors.blush} />
          <Text style={[styles.emptyText, { color: colors.sage }]}>
            No practitioners match your search
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.userId}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: p }) => (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => startConversation(p)}
              disabled={starting !== null}
              style={[styles.row, { borderBottomColor: colors.cream }]}
            >
              <LinearGradient
                colors={p.avatarColor as [string, string]}
                style={styles.avatar}
              >
                <Text style={styles.initials}>{p.initials}</Text>
              </LinearGradient>

              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.charcoal }]}>{p.name}</Text>
                  {p.verified && (
                    <Feather name="check-circle" size={13} color={colors.purpleMid} style={{ marginLeft: 5 }} />
                  )}
                  {p.online && (
                    <View style={[styles.onlineDot, { backgroundColor: "#4CAF50" }]} />
                  )}
                </View>
                <Text style={[styles.title, { color: colors.purpleMid }]} numberOfLines={1}>
                  {p.title}
                </Text>
                {p.city ? (
                  <Text style={[styles.location, { color: colors.sage }]} numberOfLines={1}>
                    {p.city}{p.country ? `, ${p.country}` : ""}
                  </Text>
                ) : null}
              </View>

              {starting === p.numericId ? (
                <ActivityIndicator color={colors.deepIndigo} size="small" />
              ) : (
                <Feather name="chevron-right" size={18} color={colors.blush} />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontFamily: "Inter_600SemiBold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  centred: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 14,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  initials: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  onlineDot: { width: 7, height: 7, borderRadius: 4, marginLeft: 6 },
  title: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  location: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
