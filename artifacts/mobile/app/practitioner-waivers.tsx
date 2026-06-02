import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  FSWaiverTemplate,
  createWaiverTemplate,
  deleteWaiverTemplate,
  subscribePractitionerWaivers,
} from "@/lib/firestore";

export default function PractitionerWaiversScreen() {
  const { numericId, name } = useLocalSearchParams<{ numericId: string; name: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [waivers, setWaivers] = useState<FSWaiverTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribePractitionerWaivers(userId, (ts) => {
      setWaivers(ts);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim() || !userId) return;
    setSaving(true);
    try {
      await createWaiverTemplate({
        practitionerNumericId: Number(numericId),
        practitionerUid: userId,
        practitionerName: name ?? "",
        title: title.trim(),
        content: content.trim(),
      });
      setTitle("");
      setContent("");
      setShowCreate(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (w: FSWaiverTemplate) => {
    Alert.alert(
      "Delete Waiver",
      `Delete "${w.title}"? Clients who have already signed it will keep their records.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteWaiverTemplate(w.id).catch(console.warn);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const canSave = title.trim().length > 0 && content.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.softWhite }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.deepIndigo }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Waivers & Forms</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.deepIndigo} size="large" />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {waivers.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="file-text" size={52} color={colors.blush} />
              <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>No waivers yet</Text>
              <Text style={[styles.emptySub, { color: colors.sage }]}>
                Create a waiver that clients must read and sign before booking a session with you.
              </Text>
            </View>
          ) : (
            waivers.map((w) => (
              <View key={w.id} style={[styles.waiverCard, { backgroundColor: "#fff", borderColor: colors.cream }]}>
                <View style={styles.waiverCardTop}>
                  <View style={[styles.iconBadge, { backgroundColor: colors.blush }]}>
                    <Feather name="file-text" size={16} color={colors.deepIndigo} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.waiverCardTitle, { color: colors.charcoal }]} numberOfLines={1}>
                      {w.title}
                    </Text>
                    <Text style={[styles.waiverCardDate, { color: colors.sage }]}>
                      Created {new Date(w.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(w)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="trash-2" size={16} color="#E53E3E" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.waiverCardPreview, { color: colors.sage }]} numberOfLines={4}>
                  {w.content}
                </Text>
              </View>
            ))
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.deepIndigo, bottom: bottomPad + 24 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowCreate(true);
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.softWhite }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.cream }]}>
              <Text style={[styles.sheetTitle, { color: colors.charcoal }]}>New Waiver</Text>
              <TouchableOpacity
                onPress={() => { setShowCreate(false); setTitle(""); setContent(""); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={22} color={colors.sage} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: colors.sage }]}>Waiver Title</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.blush, color: colors.charcoal, backgroundColor: colors.cream }]}
                placeholder="e.g. Client Consent & Liability Waiver"
                placeholderTextColor={colors.sage}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
              />

              <Text style={[styles.fieldLabel, { color: colors.sage }]}>Waiver Content</Text>
              <TextInput
                style={[styles.textarea, { borderColor: colors.blush, color: colors.charcoal, backgroundColor: colors.cream }]}
                placeholder="Write the full text of your waiver, including any disclaimers, liability clauses, and consent statements..."
                placeholderTextColor={colors.sage}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />

              <View style={[styles.tipBox, { backgroundColor: colors.blush }]}>
                <Feather name="info" size={14} color={colors.deepIndigo} />
                <Text style={[styles.tipText, { color: colors.deepIndigo }]}>
                  Clients will be shown this waiver and must type their full name and check a consent box before their booking can be confirmed.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: canSave ? colors.deepIndigo : colors.blush }]}
                disabled={!canSave || saving}
                onPress={handleCreate}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Waiver</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  list: { padding: 16 },
  emptyState: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  waiverCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  waiverCardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  iconBadge: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  waiverCardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  waiverCardDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  deleteBtn: { padding: 4 },
  waiverCardPreview: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", paddingBottom: 12 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  sheetBody: { padding: 20 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    height: 200,
    marginBottom: 20,
  },
  tipBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  tipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
