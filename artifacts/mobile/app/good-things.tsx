import { Feather } from "@expo/vector-icons";
import { AshTreeBackground } from "@/components/AshTreeBackground";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
import {
  deleteGoodThingsEntry,
  FSGoodThingsEntry,
  saveGoodThingsEntry,
  subscribeGoodThingsEntries,
} from "@/lib/firestore";

const MAX_ITEMS = 5;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(dateKey: string): string {
  const today = todayKey();
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  if (dateKey === today) return "Today";
  if (dateKey === yesterday) return "Yesterday";
  const d = new Date(dateKey + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

const PROMPTS = [
  "Something that made you smile today…",
  "A small win you're proud of…",
  "Someone who made your day better…",
  "Something you enjoyed today…",
  "A moment you felt at peace…",
];

export default function GoodThingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();

  const [entries, setEntries] = useState<FSGoodThingsEntry[]>([]);
  const [items, setItems] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (!userId) return;
    return subscribeGoodThingsEntries(userId, (all) => {
      setEntries(all);
      const todayEntry = all.find((e) => e.dateKey === todayKey());
      if (todayEntry) {
        setItems([...todayEntry.items, ...(todayEntry.items.length < MAX_ITEMS ? [""] : [])].slice(0, MAX_ITEMS));
      }
    });
  }, [userId]);

  const todayEntry = useMemo(() => entries.find((e) => e.dateKey === todayKey()), [entries]);
  const pastEntries = useMemo(() => entries.filter((e) => e.dateKey !== todayKey()), [entries]);

  const handleChange = (text: string, index: number) => {
    const updated = [...items];
    updated[index] = text;
    setItems(updated);
  };

  const handleSubmitEditing = (index: number) => {
    if (index < items.length - 1 && items.length < MAX_ITEMS) {
      inputRefs.current[index + 1]?.focus();
    } else if (items[index].trim() && items.length < MAX_ITEMS) {
      setItems([...items, ""]);
      setTimeout(() => inputRefs.current[items.length]?.focus(), 100);
    }
  };

  const addItem = () => {
    if (items.length >= MAX_ITEMS) return;
    Haptics.selectionAsync();
    setItems([...items, ""]);
    setTimeout(() => inputRefs.current[items.length]?.focus(), 100);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) { setItems([""]); return; }
    Haptics.selectionAsync();
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleSave = async () => {
    if (!userId) return;
    const filled = items.filter((s) => s.trim().length > 0);
    if (filled.length === 0) { Alert.alert("Nothing added", "Add at least one good thing first."); return; }
    setSaving(true);
    try {
      await saveGoodThingsEntry(userId, todayKey(), filled);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (entry: FSGoodThingsEntry) => {
    if (!userId) return;
    Alert.alert("Delete", `Remove good things for ${formatDate(entry.dateKey)}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteGoodThingsEntry(userId, entry.dateKey);
          if (entry.dateKey === todayKey()) setItems([""]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const filledCount = items.filter((s) => s.trim().length > 0).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <AshTreeBackground />
      <LinearGradient
        colors={["#F59E0B", "#D97706"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Good Things Today ☀️</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

          {/* Today's input */}
          <View style={[styles.todayCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
            <Text style={[styles.todayTitle, { color: colors.charcoal }]}>
              {todayEntry ? "Today's good things ✨" : "What good things happened today?"}
            </Text>
            <Text style={[styles.todaySub, { color: colors.sage }]}>
              {todayEntry
                ? `${filledCount} thing${filledCount !== 1 ? "s" : ""} logged · tap to edit`
                : "Add up to 5 moments, big or small"}
            </Text>

            <View style={{ marginTop: 14, gap: 10 }}>
              {items.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <View style={[styles.bullet, { backgroundColor: "#F59E0B" }]}>
                    <Text style={styles.bulletText}>{i + 1}</Text>
                  </View>
                  <TextInput
                    ref={(r) => { inputRefs.current[i] = r; }}
                    style={[styles.itemInput, { borderColor: colors.cream, color: colors.charcoal, backgroundColor: colors.softWhite }]}
                    value={item}
                    onChangeText={(t) => handleChange(t, i)}
                    placeholder={PROMPTS[i % PROMPTS.length]}
                    placeholderTextColor={colors.sage}
                    returnKeyType={i < MAX_ITEMS - 1 ? "next" : "done"}
                    onSubmitEditing={() => handleSubmitEditing(i)}
                    blurOnSubmit={i >= MAX_ITEMS - 1}
                  />
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="x" size={16} color={colors.sage} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {items.length < MAX_ITEMS && (
              <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
                <Feather name="plus" size={15} color="#D97706" />
                <Text style={[styles.addItemText, { color: "#D97706" }]}>Add another</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: "#F59E0B", opacity: saving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>{saving ? "Saving…" : todayEntry ? "Update" : "Save Today's Good Things"}</Text>
            </TouchableOpacity>
          </View>

          {/* Streak */}
          {entries.length > 0 && (
            <View style={[styles.streakCard, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <View>
                <Text style={[styles.streakTitle, { color: "#92400E" }]}>{entries.length} day{entries.length !== 1 ? "s" : ""} logged</Text>
                <Text style={[styles.streakSub, { color: "#B45309" }]}>Keep building your positivity habit</Text>
              </View>
            </View>
          )}

          {/* Past entries */}
          {pastEntries.length > 0 && (
            <Text style={[styles.sectionTitle, { color: colors.charcoal }]}>Previous Days</Text>
          )}
          {pastEntries.map((entry) => (
            <View key={entry.dateKey} style={[styles.pastCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
              <View style={styles.pastCardHeader}>
                <Text style={[styles.pastDate, { color: colors.charcoal }]}>{formatDate(entry.dateKey)}</Text>
                <TouchableOpacity onPress={() => handleDelete(entry)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="trash-2" size={15} color={colors.sage} />
                </TouchableOpacity>
              </View>
              {entry.items.map((item, i) => (
                <View key={i} style={styles.pastItemRow}>
                  <Text style={[styles.pastBullet, { color: "#F59E0B" }]}>✦</Text>
                  <Text style={[styles.pastItemText, { color: colors.charcoal }]}>{item}</Text>
                </View>
              ))}
            </View>
          ))}

          {entries.length === 0 && !todayEntry && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>☀️</Text>
              <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>Start your positivity habit</Text>
              <Text style={[styles.emptyText, { color: colors.sage }]}>Recording good things each day — even small ones — builds lasting happiness</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  todayCard: {
    borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 16,
  },
  todayTitle: { fontSize: 16, fontWeight: "700" },
  todaySub: { fontSize: 12, marginTop: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bullet: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  bulletText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  itemInput: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14,
  },
  addItemBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 10, alignSelf: "flex-start",
  },
  addItemText: { fontSize: 13, fontWeight: "600" },
  saveBtn: {
    marginTop: 16, borderRadius: 12,
    paddingVertical: 13, alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  streakCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16,
  },
  streakEmoji: { fontSize: 28 },
  streakTitle: { fontSize: 14, fontWeight: "700" },
  streakSub: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  pastCard: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  pastCardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  pastDate: { fontSize: 14, fontWeight: "600" },
  pastItemRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 5 },
  pastBullet: { fontSize: 12, marginTop: 2 },
  pastItemText: { flex: 1, fontSize: 13, lineHeight: 19 },
  emptyState: { alignItems: "center", paddingTop: 50, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20, maxWidth: 280 },
});
