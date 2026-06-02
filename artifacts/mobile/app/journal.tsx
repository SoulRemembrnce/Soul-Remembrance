import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
  addJournalEntry,
  deleteJournalEntry,
  FSJournalEntry,
  subscribeJournalEntries,
} from "@/lib/firestore";

const MOODS = [
  { emoji: "🌟", label: "Inspired" },
  { emoji: "😌", label: "Calm" },
  { emoji: "💜", label: "Grateful" },
  { emoji: "🌊", label: "Flowing" },
  { emoji: "🌿", label: "Grounded" },
  { emoji: "😔", label: "Processing" },
] as const;

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, isAnonymous } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [entries, setEntries] = useState<FSJournalEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftMood, setDraftMood] = useState("😌");
  const [draftMoodLabel, setDraftMoodLabel] = useState("Calm");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId || isAnonymous) return;
    return subscribeJournalEntries(userId, setEntries);
  }, [userId, isAnonymous]);

  const openEditor = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraftText("");
    setDraftMood("😌");
    setDraftMoodLabel("Calm");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!draftText.trim() || !userId) return;
    setSaving(true);
    try {
      await addJournalEntry(userId, {
        text: draftText.trim(),
        mood: draftMood,
        moodLabel: draftMoodLabel,
      });
      setShowModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      console.error("[Journal] Save error:", err);
      const code = (err as { code?: string })?.code;
      if (code === "permission-denied") {
        Alert.alert("Permission Denied", "Your account doesn't have write access yet. Please check your Firestore security rules in the Firebase Console.");
      } else {
        Alert.alert("Error", "Could not save entry. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (entry: FSJournalEntry) => {
    if (!userId) return;
    Alert.alert("Delete entry?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteJournalEntry(userId, entry.id).catch(console.warn),
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Journal</Text>
          <Text style={styles.headerSub}>
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </Text>
        </View>
        {!isAnonymous && (
          <TouchableOpacity style={styles.writeBtn} onPress={openEditor} activeOpacity={0.85}>
            <Feather name="edit-3" size={14} color="#fff" />
            <Text style={styles.writeBtnText}>Write</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {isAnonymous ? (
        <View style={styles.centreWrap}>
          <Text style={styles.bigEmoji}>📔</Text>
          <Text style={[styles.centreTitle, { color: colors.charcoal }]}>Sign in to journal</Text>
          <Text style={[styles.centreBody, { color: colors.sage }]}>
            Your journal is private and securely saved to your account. Sign in to start writing.
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.deepIndigo }]}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>Sign in to your account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {entries.length === 0 ? (
            <View style={styles.centreWrap}>
              <Text style={styles.bigEmoji}>🌱</Text>
              <Text style={[styles.centreTitle, { color: colors.charcoal }]}>Begin your journey</Text>
              <Text style={[styles.centreBody, { color: colors.sage }]}>
                Write freely — your thoughts, feelings, and reflections. Your journal is completely private.
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.deepIndigo }]}
                onPress={openEditor}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Write your first entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.entryList}>
              {entries.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.blush }]}
                  onLongPress={() => handleDelete(entry)}
                  activeOpacity={0.88}
                >
                  <View style={styles.entryHeader}>
                    <View style={styles.moodRow}>
                      <Text style={styles.moodEmoji}>{entry.mood}</Text>
                      <Text style={[styles.moodLabel, { color: colors.purpleMid }]}>{entry.moodLabel}</Text>
                    </View>
                    <Text style={[styles.entryDate, { color: colors.sage }]}>{formatEntryDate(entry.createdAt)}</Text>
                  </View>
                  <Text style={[styles.entryText, { color: colors.charcoal }]} numberOfLines={7}>
                    {entry.text}
                  </Text>
                  <Text style={[styles.holdHint, { color: colors.blush }]}>Hold to delete</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {!isAnonymous && entries.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.deepIndigo }]}
          onPress={openEditor}
          activeOpacity={0.9}
        >
          <Feather name="edit-3" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: colors.softWhite }}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: colors.blush, paddingTop: insets.top + 16 },
            ]}
          >
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.sage} />
            </TouchableOpacity>
            <Text style={[styles.modalDate, { color: colors.charcoal }]}>
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.deepIndigo,
                  opacity: !draftText.trim() || saving ? 0.4 : 1,
                },
              ]}
              onPress={handleSave}
              disabled={!draftText.trim() || saving}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.moodPickerTitle, { color: colors.sage }]}>How are you feeling?</Text>
            <View style={styles.moodGrid}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.emoji}
                  style={[
                    styles.moodOption,
                    {
                      borderColor: draftMood === m.emoji ? colors.deepIndigo : "transparent",
                      backgroundColor:
                        draftMood === m.emoji ? `${colors.deepIndigo}10` : colors.cream,
                    },
                  ]}
                  onPress={() => {
                    setDraftMood(m.emoji);
                    setDraftMoodLabel(m.label);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={styles.moodOptionEmoji}>{m.emoji}</Text>
                  <Text
                    style={[
                      styles.moodOptionLabel,
                      { color: draftMood === m.emoji ? colors.deepIndigo : colors.sage },
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[
                styles.textArea,
                { color: colors.charcoal, borderColor: colors.blush, backgroundColor: colors.card },
              ]}
              placeholder="What's on your mind, soul, and heart today…"
              placeholderTextColor={colors.sage}
              multiline
              autoFocus
              value={draftText}
              onChangeText={setDraftText}
              textAlignVertical="top"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  writeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 4,
  },
  writeBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  centreWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 20 },
  bigEmoji: { fontSize: 64, marginBottom: 20 },
  centreTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 10 },
  centreBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, maxWidth: 300 },
  emptyBtn: { marginTop: 28, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  entryList: { gap: 14 },
  entryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  entryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  moodRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  moodEmoji: { fontSize: 18 },
  moodLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  entryDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  entryText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  holdHint: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 10, textAlign: "right" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  modalDate: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  moodPickerTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 12 },
  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  moodOption: {
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    minWidth: 72,
  },
  moodOptionEmoji: { fontSize: 22, marginBottom: 4 },
  moodOptionLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  textArea: {
    minHeight: 220,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 26,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
});
