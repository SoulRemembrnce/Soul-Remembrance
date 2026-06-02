import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { FSWaiverSignature, subscribeSignedWaivers } from "@/lib/firestore";

export default function SavedWaiversScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [signatures, setSignatures] = useState<FSWaiverSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeSignedWaivers(userId, (sigs) => {
      setSignatures(sigs);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.softWhite }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.deepIndigo }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Signed Waivers</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.deepIndigo} size="large" />
      ) : signatures.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="file-text" size={52} color={colors.blush} />
          <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>No signed waivers yet</Text>
          <Text style={[styles.emptySub, { color: colors.sage }]}>
            When you book with a practitioner who requires a consent form, your signed copies will appear here for your records.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={[styles.countLabel, { color: colors.sage }]}>
            {signatures.length} signed {signatures.length === 1 ? "document" : "documents"}
          </Text>
          {signatures.map((sig) => {
            const isOpen = expanded === sig.id;
            return (
              <TouchableOpacity
                key={sig.id}
                style={[styles.card, { backgroundColor: "#fff", borderColor: colors.cream }]}
                onPress={() => setExpanded(isOpen ? null : sig.id)}
                activeOpacity={0.85}
              >
                <View style={styles.cardRow}>
                  <View style={[styles.iconBadge, { backgroundColor: "#E8F5E9" }]}>
                    <Feather name="check-circle" size={16} color="#38a169" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.charcoal }]} numberOfLines={1}>
                      {sig.waiverTitle}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors.sage }]}>
                      {sig.practitionerName}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={[styles.cardDate, { color: colors.sage }]}>
                      {new Date(sig.agreedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                    <Feather
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={colors.sage}
                    />
                  </View>
                </View>

                {isOpen && (
                  <View style={[styles.expandedArea, { borderTopColor: colors.cream }]}>
                    <View style={styles.signedRow}>
                      <Feather name="edit-3" size={13} color={colors.sage} />
                      <Text style={[styles.signedLabel, { color: colors.sage }]}>Signed by</Text>
                      <Text style={[styles.signedName, { color: colors.charcoal }]}>{sig.signedName}</Text>
                    </View>
                    <View style={[styles.legalBadge, { backgroundColor: colors.blush }]}>
                      <Feather name="shield" size={12} color={colors.deepIndigo} />
                      <Text style={[styles.legalText, { color: colors.deepIndigo }]}>
                        Digitally agreed and saved to your account
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  list: { padding: 16 },
  countLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBadge: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  cardDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  expandedArea: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, gap: 10 },
  signedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  signedLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  signedName: { fontSize: 13, fontFamily: "Inter_600SemiBold", fontStyle: "italic" },
  legalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  legalText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
