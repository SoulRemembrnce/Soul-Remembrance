import { Feather } from "@expo/vector-icons";
import { AshTreeBackground } from "@/components/AshTreeBackground";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
  addPeriodCycle,
  deletePeriodCycle,
  FSPeriodCycle,
  subscribePeriodCycles,
  updatePeriodCycle,
} from "@/lib/firestore";

const SYMPTOMS = [
  { emoji: "😣", label: "Cramps" },
  { emoji: "🤕", label: "Headache" },
  { emoji: "😮‍💨", label: "Bloating" },
  { emoji: "😴", label: "Fatigue" },
  { emoji: "😤", label: "Mood swings" },
  { emoji: "🤢", label: "Nausea" },
  { emoji: "🔙", label: "Back pain" },
  { emoji: "🍫", label: "Cravings" },
  { emoji: "💧", label: "Spotting" },
  { emoji: "🌡️", label: "Fever" },
];

const FLOW_OPTIONS: { value: FSPeriodCycle["flowLevel"]; label: string; color: string }[] = [
  { value: "light",  label: "Light",  color: "#FDA4AF" },
  { value: "medium", label: "Medium", color: "#F43F5E" },
  { value: "heavy",  label: "Heavy",  color: "#9F1239" },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T12:00:00").getTime();
  const db = new Date(b + "T12:00:00").getTime();
  return Math.round(Math.abs(da - db) / 86400000);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function cycleDuration(cycle: FSPeriodCycle): number | null {
  if (!cycle.endDate) return null;
  return daysBetween(cycle.startDate, cycle.endDate) + 1;
}

export default function PeriodTrackerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();

  const [cycles, setCycles] = useState<FSPeriodCycle[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCycle, setEditingCycle] = useState<FSPeriodCycle | null>(null);
  const [saving, setSaving] = useState(false);

  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [flowLevel, setFlowLevel] = useState<FSPeriodCycle["flowLevel"]>("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!userId) return;
    return subscribePeriodCycles(userId, setCycles);
  }, [userId]);

  const openNew = () => {
    setEditingCycle(null);
    setStartDate(todayISO());
    setEndDate("");
    setFlowLevel("");
    setSelectedSymptoms([]);
    setNotes("");
    setModalVisible(true);
  };

  const openEdit = (cycle: FSPeriodCycle) => {
    setEditingCycle(cycle);
    setStartDate(cycle.startDate);
    setEndDate(cycle.endDate ?? "");
    setFlowLevel(cycle.flowLevel);
    setSelectedSymptoms([...cycle.symptoms]);
    setNotes(cycle.notes);
    setModalVisible(true);
  };

  const toggleSymptom = (label: string) => {
    Haptics.selectionAsync();
    setSelectedSymptoms((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!startDate) { Alert.alert("Missing date", "Please enter a start date."); return; }
    if (endDate && endDate < startDate) { Alert.alert("Invalid dates", "End date must be on or after start date."); return; }
    setSaving(true);
    try {
      const data = {
        startDate,
        endDate: endDate || undefined,
        flowLevel,
        symptoms: selectedSymptoms,
        notes,
      };
      if (editingCycle) {
        await updatePeriodCycle(userId, editingCycle.id, data);
      } else {
        await addPeriodCycle(userId, data);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
    } catch {
      Alert.alert("Error", "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cycle: FSPeriodCycle) => {
    if (!userId) return;
    Alert.alert("Delete Cycle", "Remove this cycle from your history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deletePeriodCycle(userId, cycle.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const { avgCycleLength, nextPeriod, currentDayInCycle } = useMemo(() => {
    const completed = cycles.filter((c) => !!c.endDate);
    if (completed.length < 2) {
      return { avgCycleLength: 28, nextPeriod: null, currentDayInCycle: null };
    }
    const gaps: number[] = [];
    for (let i = 0; i < completed.length - 1; i++) {
      gaps.push(daysBetween(completed[i].startDate, completed[i + 1].startDate));
    }
    const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    const latest = completed[0];
    const next = addDays(latest.startDate, avg);
    const today = todayISO();
    const dayIn = daysBetween(latest.startDate, today) + 1;
    return { avgCycleLength: avg, nextPeriod: next, currentDayInCycle: dayIn <= avg ? dayIn : null };
  }, [cycles]);

  const activeCycle = cycles.find((c) => !c.endDate);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <AshTreeBackground />
      <LinearGradient
        colors={["#C9A0C4", "#9B4FAB"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Period Tracker</Text>
        <TouchableOpacity onPress={openNew} style={styles.addBtn}>
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Cycle Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: "#9B4FAB" }]}>{avgCycleLength}</Text>
              <Text style={[styles.summaryLabel, { color: colors.sage }]}>Avg cycle (days)</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.cream }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: "#9B4FAB" }]}>
                {activeCycle ? daysBetween(activeCycle.startDate, todayISO()) + 1 : currentDayInCycle ?? "—"}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.sage }]}>
                {activeCycle ? "Day (active)" : "Day in cycle"}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.cream }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: "#9B4FAB" }]}>{cycles.length}</Text>
              <Text style={[styles.summaryLabel, { color: colors.sage }]}>Cycles logged</Text>
            </View>
          </View>

          {nextPeriod && !activeCycle && (
            <View style={[styles.nextPeriodBanner, { backgroundColor: "#FCE7F3" }]}>
              <Text style={styles.nextPeriodEmoji}>🌸</Text>
              <View>
                <Text style={[styles.nextPeriodTitle, { color: "#9B4FAB" }]}>Next period expected</Text>
                <Text style={[styles.nextPeriodDate, { color: "#6B4FA8" }]}>{formatDate(nextPeriod)}</Text>
              </View>
            </View>
          )}
          {activeCycle && (
            <View style={[styles.nextPeriodBanner, { backgroundColor: "#FCE7F3" }]}>
              <Text style={styles.nextPeriodEmoji}>🩸</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nextPeriodTitle, { color: "#9B4FAB" }]}>Period in progress</Text>
                <Text style={[styles.nextPeriodDate, { color: "#6B4FA8" }]}>
                  Started {formatDate(activeCycle.startDate)} · Day {daysBetween(activeCycle.startDate, todayISO()) + 1}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.endBtn, { backgroundColor: "#9B4FAB" }]}
                onPress={() => openEdit(activeCycle)}
              >
                <Text style={styles.endBtnText}>Log end</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Start new period button */}
        {!activeCycle && (
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: "#9B4FAB" }]}
            onPress={openNew}
            activeOpacity={0.85}
          >
            <Text style={styles.nextPeriodEmoji}>🩸</Text>
            <Text style={styles.startBtnText}>Log Period Start</Text>
          </TouchableOpacity>
        )}

        {/* History */}
        {cycles.length > 0 && (
          <Text style={[styles.sectionTitle, { color: colors.charcoal }]}>Cycle History</Text>
        )}
        {cycles.map((cycle) => {
          const duration = cycleDuration(cycle);
          const flow = FLOW_OPTIONS.find((f) => f.value === cycle.flowLevel);
          return (
            <TouchableOpacity
              key={cycle.id}
              style={[styles.cycleCard, { backgroundColor: colors.card, borderColor: colors.cream }]}
              onPress={() => openEdit(cycle)}
              activeOpacity={0.85}
            >
              <View style={styles.cycleCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cycleDate, { color: colors.charcoal }]}>
                    {formatDate(cycle.startDate)}
                    {cycle.endDate ? ` → ${formatDate(cycle.endDate)}` : " (ongoing)"}
                  </Text>
                  <View style={styles.cycleMetaRow}>
                    {duration !== null && (
                      <View style={[styles.chip, { backgroundColor: "#FCE7F3" }]}>
                        <Text style={[styles.chipText, { color: "#9B4FAB" }]}>{duration} days</Text>
                      </View>
                    )}
                    {flow && (
                      <View style={[styles.chip, { backgroundColor: flow.color + "22" }]}>
                        <Text style={[styles.chipText, { color: flow.color }]}>{flow.label}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(cycle)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="trash-2" size={16} color={colors.sage} />
                </TouchableOpacity>
              </View>
              {cycle.symptoms.length > 0 && (
                <View style={styles.symptomRow}>
                  {cycle.symptoms.slice(0, 5).map((s) => {
                    const sym = SYMPTOMS.find((x) => x.label === s);
                    return (
                      <View key={s} style={[styles.chip, { backgroundColor: colors.cream }]}>
                        <Text style={styles.chipText}>{sym?.emoji} {s}</Text>
                      </View>
                    );
                  })}
                  {cycle.symptoms.length > 5 && (
                    <Text style={[styles.chipText, { color: colors.sage }]}>+{cycle.symptoms.length - 5}</Text>
                  )}
                </View>
              )}
              {!!cycle.notes && (
                <Text style={[styles.cycleNotes, { color: colors.sage }]} numberOfLines={2}>{cycle.notes}</Text>
              )}
            </TouchableOpacity>
          );
        })}

        {cycles.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌸</Text>
            <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>No cycles logged yet</Text>
            <Text style={[styles.emptyText, { color: colors.sage }]}>Tap the + button or "Log Period Start" to begin tracking your cycle</Text>
          </View>
        )}
      </ScrollView>

      {/* Log / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.softWhite }]}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <Text style={[styles.modalTitle, { color: colors.charcoal }]}>
                  {editingCycle ? "Edit Cycle" : "Log Period"}
                </Text>

                <Text style={[styles.fieldLabel, { color: colors.charcoal }]}>Start Date</Text>
                <TextInput
                  style={[styles.dateInput, { borderColor: colors.cream, color: colors.charcoal, backgroundColor: colors.card }]}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.sage}
                />

                <Text style={[styles.fieldLabel, { color: colors.charcoal }]}>End Date (optional)</Text>
                <TextInput
                  style={[styles.dateInput, { borderColor: colors.cream, color: colors.charcoal, backgroundColor: colors.card }]}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD (leave blank if still ongoing)"
                  placeholderTextColor={colors.sage}
                />

                <Text style={[styles.fieldLabel, { color: colors.charcoal }]}>Flow</Text>
                <View style={styles.flowRow}>
                  {FLOW_OPTIONS.map((f) => (
                    <TouchableOpacity
                      key={f.value}
                      style={[
                        styles.flowChip,
                        { borderColor: f.color },
                        flowLevel === f.value && { backgroundColor: f.color },
                      ]}
                      onPress={() => { Haptics.selectionAsync(); setFlowLevel(f.value); }}
                    >
                      <Text style={[styles.flowChipText, { color: flowLevel === f.value ? "#fff" : f.color }]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: colors.charcoal }]}>Symptoms</Text>
                <View style={styles.symptomsGrid}>
                  {SYMPTOMS.map((s) => (
                    <TouchableOpacity
                      key={s.label}
                      style={[
                        styles.symptomChip,
                        { borderColor: colors.cream, backgroundColor: colors.card },
                        selectedSymptoms.includes(s.label) && { backgroundColor: "#FCE7F3", borderColor: "#C9A0C4" },
                      ]}
                      onPress={() => toggleSymptom(s.label)}
                    >
                      <Text style={styles.symptomEmoji}>{s.emoji}</Text>
                      <Text style={[styles.symptomLabel, { color: selectedSymptoms.includes(s.label) ? "#9B4FAB" : colors.charcoal }]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: colors.charcoal }]}>Notes</Text>
                <TextInput
                  style={[styles.notesInput, { borderColor: colors.cream, color: colors.charcoal, backgroundColor: colors.card }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="How are you feeling? Any observations..."
                  placeholderTextColor={colors.sage}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.cream }]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.sage }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: "#9B4FAB" }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  addBtn: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  summaryCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontSize: 24, fontWeight: "700" },
  summaryLabel: { fontSize: 11, marginTop: 2, textAlign: "center" },
  summaryDivider: { width: 1, height: 40 },
  nextPeriodBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 12, padding: 12, marginTop: 14,
  },
  nextPeriodEmoji: { fontSize: 22 },
  nextPeriodTitle: { fontSize: 12, fontWeight: "600" },
  nextPeriodDate: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  endBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  endBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  startBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 14, paddingVertical: 16, marginBottom: 20,
  },
  startBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  cycleCard: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  cycleCardTop: { flexDirection: "row", alignItems: "flex-start" },
  cycleDate: { fontSize: 14, fontWeight: "600" },
  cycleMetaRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: "500" },
  symptomRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  cycleNotes: { fontSize: 12, marginTop: 8, lineHeight: 18 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: "92%",
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 14 },
  dateInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14,
  },
  flowRow: { flexDirection: "row", gap: 10 },
  flowChip: {
    flex: 1, alignItems: "center", paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
  },
  flowChipText: { fontSize: 13, fontWeight: "600" },
  symptomsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  symptomChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
  },
  symptomEmoji: { fontSize: 14 },
  symptomLabel: { fontSize: 12, fontWeight: "500" },
  notesInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, minHeight: 80, textAlignVertical: "top",
  },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, alignItems: "center", paddingVertical: 14,
    borderRadius: 12, borderWidth: 1,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  saveBtn: {
    flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
