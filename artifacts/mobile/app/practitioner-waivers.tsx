import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
  FSWaiverSignature,
  FSWaiverTemplate,
  createWaiverTemplate,
  deleteWaiverTemplate,
  subscribePractitionerWaiverSignatures,
  subscribePractitionerWaivers,
} from "@/lib/firestore";

type Tab = "templates" | "signatures";

export default function PractitionerWaiversScreen() {
  const { numericId, name } = useLocalSearchParams<{ numericId: string; name: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeTab, setActiveTab] = useState<Tab>("templates");
  const [waivers, setWaivers] = useState<FSWaiverTemplate[]>([]);
  const [signatures, setSignatures] = useState<FSWaiverSignature[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingSignatures, setLoadingSignatures] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedSig, setExpandedSig] = useState<string | null>(null);

  const numericIdNum = numericId ? Number(numericId) : 0;
  const safeNumericId = isNaN(numericIdNum) ? 0 : numericIdNum;

  useEffect(() => {
    if (!userId) {
      setLoadingTemplates(false);
      return;
    }
    const unsub = subscribePractitionerWaivers(
      userId,
      (ts) => {
        setWaivers(ts);
        setLoadingTemplates(false);
      },
      (err) => {
        setLoadingTemplates(false);
        Alert.alert("Firestore Error", `Could not load waivers:\n${err.message}`);
      }
    );
    return unsub;
  }, [userId]);

  useEffect(() => {
    if (!safeNumericId) return;
    const unsub = subscribePractitionerWaiverSignatures(safeNumericId, (sigs) => {
      setSignatures(sigs);
      setLoadingSignatures(false);
    });
    return unsub;
  }, [numericIdNum]);

  const handleCreate = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;
    if (!userId) {
      Alert.alert("Not Signed In", "You must be signed in to save waivers. Please sign out and back in.");
      return;
    }
    setSaving(true);
    try {
      await createWaiverTemplate({
        practitionerNumericId: safeNumericId,
        practitionerUid: userId,
        practitionerName: name ?? "",
        title: title.trim(),
        content: content.trim(),
      });
      setTitle("");
      setContent("");
      setShowCreate(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const code = err?.code ? ` (${err.code})` : "";
      Alert.alert("Save Failed", (err?.message ?? "Could not save waiver.") + code);
    } finally {
      setSaving(false);
    }
  }, [title, content, userId, numericIdNum, name]);

  const handleDelete = useCallback((w: FSWaiverTemplate) => {
    Alert.alert(
      "Delete Waiver",
      `Delete "${w.title}"? Clients who have already signed it will keep their records.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteWaiverTemplate(w.id).catch((err) =>
              Alert.alert("Error", err?.message ?? "Could not delete waiver.")
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }, []);

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

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.deepIndigo, paddingBottom: 12 }]}>
        <View style={[styles.tabPill, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "templates" && { backgroundColor: "#fff" }]}
            onPress={() => setActiveTab("templates")}
            activeOpacity={0.8}
          >
            <Feather
              name="file-text"
              size={14}
              color={activeTab === "templates" ? colors.deepIndigo : "rgba(255,255,255,0.7)"}
            />
            <Text style={[styles.tabText, { color: activeTab === "templates" ? colors.deepIndigo : "rgba(255,255,255,0.7)" }]}>
              My Waivers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "signatures" && { backgroundColor: "#fff" }]}
            onPress={() => setActiveTab("signatures")}
            activeOpacity={0.8}
          >
            <Feather
              name="check-circle"
              size={14}
              color={activeTab === "signatures" ? colors.deepIndigo : "rgba(255,255,255,0.7)"}
            />
            <Text style={[styles.tabText, { color: activeTab === "signatures" ? colors.deepIndigo : "rgba(255,255,255,0.7)" }]}>
              Client Signatures
            </Text>
            {signatures.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.warmGold }]}>
                <Text style={styles.badgeText}>{signatures.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <>
          {loadingTemplates ? (
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
                          Created{" "}
                          {new Date(w.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDelete(w)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
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
        </>
      )}

      {/* Signatures Tab */}
      {activeTab === "signatures" && (
        <>
          {loadingSignatures ? (
            <ActivityIndicator style={{ marginTop: 60 }} color={colors.deepIndigo} size="large" />
          ) : signatures.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="check-circle" size={52} color={colors.blush} />
              <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>No signatures yet</Text>
              <Text style={[styles.emptySub, { color: colors.sage }]}>
                When a client signs one of your waivers before booking, their record will appear here.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              <Text style={[styles.countLabel, { color: colors.sage }]}>
                {signatures.length} signed {signatures.length === 1 ? "document" : "documents"}
              </Text>
              {signatures.map((sig) => {
                const isOpen = expandedSig === sig.id;
                return (
                  <TouchableOpacity
                    key={sig.id}
                    style={[styles.sigCard, { backgroundColor: "#fff", borderColor: colors.cream }]}
                    onPress={() => setExpandedSig(isOpen ? null : sig.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.sigCardRow}>
                      <View style={[styles.iconBadge, { backgroundColor: "#E8F5E9" }]}>
                        <Feather name="check-circle" size={16} color="#38a169" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.waiverCardTitle, { color: colors.charcoal }]} numberOfLines={1}>
                          {sig.waiverTitle}
                        </Text>
                        <Text style={[styles.waiverCardDate, { color: colors.sage }]}>
                          Signed by{" "}
                          <Text style={{ fontFamily: "Inter_600SemiBold", fontStyle: "italic" }}>
                            {sig.signedName}
                          </Text>
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text style={[styles.waiverCardDate, { color: colors.sage }]}>
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
                        <View style={[styles.legalBadge, { backgroundColor: colors.blush }]}>
                          <Feather name="shield" size={12} color={colors.deepIndigo} />
                          <Text style={[styles.legalText, { color: colors.deepIndigo }]}>
                            Digitally agreed and stored on{" "}
                            {new Date(sig.agreedAt).toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
        </>
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.softWhite }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.cream }]}>
              <Text style={[styles.sheetTitle, { color: colors.charcoal }]}>New Waiver</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreate(false);
                  setTitle("");
                  setContent("");
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={22} color={colors.sage} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.fieldLabel, { color: colors.sage }]}>Waiver Title</Text>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.blush, color: colors.charcoal, backgroundColor: colors.cream },
                ]}
                placeholder="e.g. Client Consent & Liability Waiver"
                placeholderTextColor={colors.sage}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
              />

              <Text style={[styles.fieldLabel, { color: colors.sage }]}>Waiver Content</Text>
              <TextInput
                style={[
                  styles.textarea,
                  { borderColor: colors.blush, color: colors.charcoal, backgroundColor: colors.cream },
                ]}
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
                  Clients will be shown this waiver and must type their full name and check a consent box
                  before their booking can be confirmed.
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
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },
  tabRow: { paddingHorizontal: 16 },
  tabPill: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
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
  sigCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10 },
  sigCardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  expandedArea: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
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
  countLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 12 },
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
