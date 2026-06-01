import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import {
  FSAvailabilitySlot,
  addAvailabilitySlot,
  cancelBookingByPractitioner,
  deleteAvailabilitySlot,
  setSlotVideoLink,
  subscribeAvailability,
} from "@/lib/firestore";

// ── Time slots (8 AM – 8 PM) ──────────────────────────────────────────────────
const TIME_SLOTS: { timeISO: string; label: string }[] = [];
for (let h = 8; h <= 20; h++) {
  const timeISO = `${String(h).padStart(2, "0")}:00`;
  const ampm = h < 12 ? "AM" : "PM";
  const displayH = h === 12 ? 12 : h > 12 ? h - 12 : h;
  TIME_SLOTS.push({ timeISO, label: `${displayH}:00 ${ampm}` });
}

// ── Date helpers ──────────────────────────────────────────────────────────────
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toDateLabel(dateISO: string): string {
  const [y, m, day] = dateISO.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  return `${DAY_NAMES[d.getDay()]} ${day} ${MONTH_NAMES[m - 1]}`;
}

function buildDateRange() {
  const result: { iso: string; dayName: string; dayNum: number; monthName: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    result.push({
      iso: toISO(d),
      dayName: DAY_NAMES[d.getDay()],
      dayNum: d.getDate(),
      monthName: MONTH_NAMES[d.getMonth()],
    });
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ManageAvailabilityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { numericId, practitionerName } = useLocalSearchParams<{
    numericId: string;
    practitionerName: string;
  }>();

  const numId = Number(numericId);
  const dates = useMemo(() => buildDateRange(), []);

  const [selectedDateISO, setSelectedDateISO] = useState(dates[0].iso);
  const [slots, setSlots] = useState<FSAvailabilitySlot[]>([]);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  // Video link modal
  const [videoModal, setVideoModal] = useState<{
    visible: boolean;
    slot: FSAvailabilitySlot | null;
    value: string;
    saving: boolean;
  }>({ visible: false, slot: null, value: "", saving: false });
  const videoInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!numId) return;
    return subscribeAvailability(numId, setSlots);
  }, [numId]);

  const slotsForDate = useMemo(() => {
    const map = new Map<string, FSAvailabilitySlot>();
    for (const s of slots) {
      if (s.dateISO === selectedDateISO) map.set(s.timeISO, s);
    }
    return map;
  }, [slots, selectedDateISO]);

  const totalAvailable = slots.filter((s) => !s.booked).length;
  const totalBooked = slots.filter((s) => s.booked).length;
  const selectedDateInfo = dates.find((d) => d.iso === selectedDateISO);

  const handleToggleSlot = (timeISO: string, timeLabel: string) => {
    const existing = slotsForDate.get(timeISO);
    const slotId = `${numId}_${selectedDateISO}_${timeISO.replace(":", "")}`;
    const dateLabel = toDateLabel(selectedDateISO);

    if (existing?.booked) {
      // Action sheet for booked slots
      Alert.alert(
        `${timeLabel} — ${dateLabel}`,
        "What would you like to do with this booking?",
        [
          {
            text: "Set video call link",
            onPress: () => {
              setVideoModal({
                visible: true,
                slot: existing,
                value: existing.videoLink ?? "",
                saving: false,
              });
            },
          },
          {
            text: "Cancel booking",
            style: "destructive",
            onPress: async () => {
              setToggling((prev) => new Set(prev).add(slotId));
              await cancelBookingByPractitioner(existing).catch(console.warn);
              setToggling((prev) => {
                const n = new Set(prev);
                n.delete(slotId);
                return n;
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
          { text: "Dismiss", style: "cancel" },
        ]
      );
    } else if (existing) {
      // Remove an available (unbooked) slot
      Alert.alert(
        "Remove slot?",
        `Remove ${timeLabel} on ${dateLabel}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              setToggling((prev) => new Set(prev).add(slotId));
              await deleteAvailabilitySlot(existing.id).catch(console.warn);
              setToggling((prev) => {
                const n = new Set(prev);
                n.delete(slotId);
                return n;
              });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            },
          },
        ]
      );
    } else {
      // Add a new slot
      (async () => {
        setToggling((prev) => new Set(prev).add(slotId));
        await addAvailabilitySlot(numId, selectedDateISO, dateLabel, timeISO, timeLabel).catch(
          console.warn
        );
        setToggling((prev) => {
          const n = new Set(prev);
          n.delete(slotId);
          return n;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      })();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.headerTitle}>Manage Availability</Text>
          {practitionerName ? (
            <Text style={styles.headerSub}>{practitionerName}</Text>
          ) : null}
        </View>
      </LinearGradient>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderBottomColor: colors.cream }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.deepIndigo }]}>{totalAvailable}</Text>
          <Text style={[styles.statLabel, { color: colors.sage }]}>Available</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.blush }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.warmGold }]}>{totalBooked}</Text>
          <Text style={[styles.statLabel, { color: colors.sage }]}>Booked</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.blush }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.charcoal }]}>{slots.length}</Text>
          <Text style={[styles.statLabel, { color: colors.sage }]}>Total</Text>
        </View>
      </View>

      {/* Date picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.datePicker, { backgroundColor: colors.card, borderBottomColor: colors.cream }]}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        {dates.map((d) => {
          const selected = d.iso === selectedDateISO;
          return (
            <TouchableOpacity
              key={d.iso}
              style={[
                styles.datePill,
                selected
                  ? { backgroundColor: colors.deepIndigo }
                  : { backgroundColor: colors.cream },
              ]}
              onPress={() => {
                setSelectedDateISO(d.iso);
                Haptics.selectionAsync();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.datePillDay, { color: selected ? "rgba(255,255,255,0.65)" : colors.sage }]}>
                {d.dayName}
              </Text>
              <Text style={[styles.datePillNum, { color: selected ? "#fff" : colors.charcoal }]}>
                {d.dayNum}
              </Text>
              <Text style={[styles.datePillMonth, { color: selected ? "rgba(255,255,255,0.55)" : colors.sage }]}>
                {d.monthName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Time grid */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.timeGrid}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.dayHeading, { color: colors.charcoal }]}>
          {selectedDateInfo
            ? `${selectedDateInfo.dayName}, ${selectedDateInfo.dayNum} ${selectedDateInfo.monthName}`
            : ""}
        </Text>
        <Text style={[styles.dayHint, { color: colors.sage }]}>
          Tap to add a slot · tap again to remove
        </Text>

        <View style={styles.grid}>
          {TIME_SLOTS.map(({ timeISO, label }) => {
            const slotId = `${numId}_${selectedDateISO}_${timeISO.replace(":", "")}`;
            const existing = slotsForDate.get(timeISO);
            const isBooked = existing?.booked ?? false;
            const isAdded = !!existing;
            const isToggling = toggling.has(slotId);

            const bgColor = isBooked
              ? "#FFF8EE"
              : isAdded
              ? colors.deepIndigo
              : colors.softWhite;
            const borderColor = isBooked
              ? "#E8A838"
              : isAdded
              ? colors.deepIndigo
              : colors.blush;
            const textColor = isBooked ? "#92600A" : isAdded ? "#fff" : colors.charcoal;
            const icon: "x-circle" | "check" | "plus" = isBooked ? "x-circle" : isAdded ? "check" : "plus";
            const iconColor = isBooked ? "#E8A838" : isAdded ? "rgba(255,255,255,0.7)" : colors.blush;

            return (
              <TouchableOpacity
                key={timeISO}
                style={[styles.timeSlot, { backgroundColor: bgColor, borderColor }]}
                onPress={() => handleToggleSlot(timeISO, label)}
                disabled={isToggling}
                activeOpacity={0.75}
              >
                {isToggling ? (
                  <ActivityIndicator
                    size="small"
                    color={isBooked ? "#E8A838" : isAdded ? "#fff" : colors.deepIndigo}
                  />
                ) : (
                  <>
                    <View>
                      <Text style={[styles.timeText, { color: textColor }]}>{label}</Text>
                      {isBooked && (
                        <Text style={styles.bookedLabel}>Booked · tap to cancel</Text>
                      )}
                    </View>
                    <Feather name={icon} size={14} color={iconColor} />
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Video link modal ─────────────────────────────────── */}
      <Modal
        visible={videoModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVideoModal((m) => ({ ...m, visible: false }))}
        onShow={() => setTimeout(() => videoInputRef.current?.focus(), 100)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Video call link</Text>
            <Text style={styles.modalSub}>
              Paste your Zoom, Google Meet, or Teams link. The client will see a "Join Call" button in their sessions.
            </Text>
            <TextInput
              ref={videoInputRef}
              style={styles.modalInput}
              value={videoModal.value}
              onChangeText={(t) => setVideoModal((m) => ({ ...m, value: t }))}
              placeholder="https://zoom.us/j/..."
              placeholderTextColor="#B0A8C8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setVideoModal((m) => ({ ...m, visible: false }))}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { opacity: videoModal.saving ? 0.6 : 1 }]}
                disabled={videoModal.saving || !videoModal.value.trim()}
                onPress={async () => {
                  if (!videoModal.slot) return;
                  setVideoModal((m) => ({ ...m, saving: true }));
                  await setSlotVideoLink(videoModal.slot, videoModal.value.trim()).catch(console.warn);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setVideoModal({ visible: false, slot: null, value: "", saving: false });
                }}
              >
                {videoModal.saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save link</Text>
                )}
              </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statDivider: {
    width: 1,
    alignSelf: "center",
    height: 36,
  },
  datePicker: {
    borderBottomWidth: 1,
    flexGrow: 0,
  },
  datePill: {
    width: 54,
    height: 74,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    gap: 1,
  },
  datePillDay: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  datePillNum: {
    fontSize: 21,
    fontFamily: "Inter_700Bold",
  },
  datePillMonth: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  timeGrid: {
    padding: 20,
  },
  dayHeading: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  dayHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeSlot: {
    width: "47.5%",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 50,
  },
  timeText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  bookedLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#E8A838",
    marginTop: 2,
  },
  // ── Video link modal ───────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30,15,60,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#2D1B69",
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#7B5EA7",
    marginBottom: 16,
    lineHeight: 19,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#DDD0F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#2D1B69",
    marginBottom: 20,
    backgroundColor: "#FAF5FF",
  },
  modalBtns: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#DDD0F0",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#7B5EA7",
  },
  modalSave: {
    flex: 1,
    backgroundColor: "#2D1B69",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
