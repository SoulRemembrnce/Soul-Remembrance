import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  addGratitudeEntry,
  deleteGratitudeEntry,
  FSGratitudeEntry,
  subscribeGratitudeEntries,
} from "@/lib/firestore";

const PROMPTS = [
  "What made you smile today?",
  "Who are you grateful for right now?",
  "What simple pleasure brought you joy?",
  "What challenge helped you grow?",
  "What beauty did you notice today?",
  "What are you grateful for in your body?",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function GratitudeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, isAnonymous } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [entries, setEntries] = useState<FSGratitudeEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [saving, setSaving] = useState(false);

  const prompt = useMemo(
    () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)],
    []
  );

  const openEditor = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraftText("");
    setShowModal(true);
  }, []);

  useEffect(() => {
    if (!userId || isAnonymous) return;
    return subscribeGratitudeEntries(userId, setEntries);
  }, [userId, isAnonymous]);

  const handleSave = async () => {
    if (!draftText.trim() || !userId) return;
    setSaving(true);
    try {
      await addGratitudeEntry(userId, draftText.trim());
      setShowModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (entry: FSGratitudeEntry) => {
    if (!userId) return;
    Alert.alert("Remove gratitude?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteGratitudeEntry(userId, entry.id).catch(console.warn),
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
          <Text style={styles.headerLabel}>MY GRATITUDES</Text>
          <Text style={styles.headerTitle}>Gratitude List</Text>
          <Text style={styles.headerSub}>
            {entries.length} {entries.length === 1 ? "blessing" : "blessings"} recorded
          </Text>
        </View>
        {!isAnonymous && (
          <TouchableOpacity style={styles.addBtn} onPress={openEditor} activeOpacity={0.85}>
            <Text style={styles.addBtnIcon}>✦</Text>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {isAnonymous ? (
        <View style={styles.centreWrap}>
          <Text style={styles.bigEmoji}>✨</Text>
          <Text style={[styles.centreTitle, { color: colors.charcoal }]}>Sign in to track gratitude</Text>
          <Text style={[styles.centreBody, { color: colors.sage }]}>
            Your gratitude list is private and saved securely to your account. Sign in to begin.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Daily prompt card */}
          <TouchableOpacity
            style={[styles.promptCard, { backgroundColor: `${colors.warmGold}12`, borderColor: `${colors.warmGold}30` }]}
            onPress={openEditor}
            activeOpacity={0.82}
          >
            <Text style={styles.promptEmoji}>🌅</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.promptLabel, { color: colors.warmGold }]}>TODAY'S PROMPT</Text>
              <Text style={[styles.promptText, { color: colors.sage }]}>{prompt}</Text>
            </View>
            <Feather name="plus-circle" size={20} color={colors.warmGold} />
          </TouchableOpacity>

          {entries.length === 0 ? (
            <View style={styles.centreWrap}>
              <Text style={styles.bigEmoji}>🌱</Text>
              <Text style={[styles.centreTitle, { color: colors.charcoal }]}>Begin your practice</Text>
              <Text style={[styles.centreBody, { color: colors.sage }]}>
                Gratitude rewires your mind for joy. Start by writing one thing you're grateful for today.
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.deepIndigo }]}
                onPress={openEditor}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Write your first gratitude</Text>
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
                  <View style={styles.entryRow}>
                    <View style={[styles.sparkleBox, { backgroundColor: `${colors.purpleMid}10` }]}>
                      <Text style={styles.sparkle}>✨</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.entryText, { color: colors.charcoal }]}>{entry.text}</Text>
                      <Text style={[styles.entryDate, { color: colors.sage }]}>{formatDate(entry.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.holdHint, { color: colors.blush }]}>Hold to remove</Text>
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
          <Feather name="plus" size={22} color="#fff" />
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
          <View style={[styles.modalHeader, { borderBottomColor: colors.blush, paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.sage} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.charcoal }]}>I am grateful for…</Text>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.deepIndigo, opacity: !draftText.trim() || saving ? 0.4 : 1 }]}
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
            <View style={[styles.promptBanner, { backgroundColor: `${colors.warmGold}10`, borderColor: `${colors.warmGold}25` }]}>
              <Text style={styles.promptBannerEmoji}>💛</Text>
              <Text style={[styles.promptBannerText, { color: colors.sage }]}>{prompt}</Text>
            </View>

            <TextInput
              style={[styles.textArea, { color: colors.charcoal, borderColor: colors.blush, backgroundColor: colors.card }]}
              placeholder="Write your gratitude here…"
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
  headerLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 4,
  },
  addBtnIcon: { color: "#C9A84C", fontSize: 12 },
  addBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  centreWrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 20 },
  bigEmoji: { fontSize: 64, marginBottom: 20 },
  centreTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 10 },
  centreBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, maxWidth: 300 },
  emptyBtn: { marginTop: 28, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  promptCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  promptEmoji: { fontSize: 24 },
  promptLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 3 },
  promptText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  entryList: { gap: 12 },
  entryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  entryRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  sparkleBox: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sparkle: { fontSize: 18 },
  entryText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23, marginBottom: 6 },
  entryDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
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
  modalTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  saveBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  promptBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  promptBannerEmoji: { fontSize: 20 },
  promptBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  textArea: {
    minHeight: 180,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 26,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
});
