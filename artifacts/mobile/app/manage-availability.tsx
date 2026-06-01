import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useCalendarSync, type BusySlot, type CalendarInfo } from "@/hooks/useCalendarSync";
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

  // Calendar sync
  const {
    permission: calPermission,
    calendars,
    linkedCalendar,
    loading: calLoading,
    requestPermission,
    linkCalendar,
    unlinkCalendar,
    getBusySlotsForDate,
  } = useCalendarSync();

  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [calPickerVisible, setCalPickerVisible] = useState(false);

  // Fetch busy slots whenever date or linked calendar changes
  useEffect(() => {
    getBusySlotsForDate(selectedDateISO).then(setBusySlots);
  }, [selectedDateISO, linkedCalendar, getBusySlotsForDate]);

  const handleLinkCalendarPress = useCallback(async () => {
    if (calPermission !== "granted") {
      const ok = await requestPermission();
      if (!ok) {
        Alert.alert(
          "Calendar access required",
          "Please allow calendar access in your device settings to link a calendar.",
        );
        return;
      }
    }
    setCalPickerVisible(true);
  }, [calPermission, requestPermission]);

  const isBusy = useCallback(
    (timeISO: string): BusySlot | null => {
      const [h] = timeISO.split(":").map(Number);
      return busySlots.find((b) => h >= Math.floor(b.startHour) && h < Math.ceil(b.endHour)) ?? null;
    },
    [busySlots]
  );

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

      {/* Calendar link banner */}
      {!calLoading && (
        <TouchableOpacity
          style={[
            styles.calBanner,
            {
              backgroundColor: linkedCalendar ? `${colors.deepIndigo}10` : colors.card,
              borderBottomColor: colors.cream,
            },
          ]}
          onPress={linkedCalendar ? () => setCalPickerVisible(true) : handleLinkCalendarPress}
          activeOpacity={0.8}
        >
          <View style={[styles.calIconWrap, { backgroundColor: linkedCalendar ? `${colors.deepIndigo}18` : colors.cream }]}>
            <Feather name="calendar" size={16} color={linkedCalendar ? colors.deepIndigo : colors.sage} />
          </View>
          <View style={{ flex: 1 }}>
            {linkedCalendar ? (
              <>
                <Text style={[styles.calBannerTitle, { color: colors.deepIndigo }]}>
                  {linkedCalendar.title}
                </Text>
                <Text style={[styles.calBannerSub, { color: colors.sage }]}>
                  {linkedCalendar.source} · busy times shown in grid
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.calBannerTitle, { color: colors.charcoal }]}>Link your calendar</Text>
                <Text style={[styles.calBannerSub, { color: colors.sage }]}>
                  See your Google, Apple or Outlook events to avoid double-bookings
                </Text>
              </>
            )}
          </View>
          {linkedCalendar ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                Alert.alert("Unlink calendar?", `Disconnect "${linkedCalendar.title}"?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Unlink", style: "destructive", onPress: unlinkCalendar },
                ]);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 8 }}
            >
              <Feather name="x" size={16} color={colors.sage} />
            </TouchableOpacity>
          ) : (
            <Feather name="chevron-right" size={16} color={colors.sage} />
          )}
        </TouchableOpacity>
      )}

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
            const calBusy = isBusy(timeISO);

            const bgColor = isBooked
              ? "#FFF8EE"
              : isAdded
              ? colors.deepIndigo
              : calBusy
              ? "#F5F0FF"
              : colors.softWhite;
            const borderColor = isBooked
              ? "#E8A838"
              : isAdded
              ? colors.deepIndigo
              : calBusy
              ? colors.lavenderMid
              : colors.blush;
            const textColor = isBooked ? "#92600A" : isAdded ? "#fff" : calBusy ? colors.purpleMid : colors.charcoal;
            const icon: "x-circle" | "check" | "plus" | "calendar" = isBooked
              ? "x-circle"
              : isAdded
              ? "check"
              : calBusy
              ? "calendar"
              : "plus";
            const iconColor = isBooked
              ? "#E8A838"
              : isAdded
              ? "rgba(255,255,255,0.7)"
              : calBusy
              ? colors.lavenderMid
              : colors.blush;

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
                    <View style={{ flex: 1, marginRight: 4 }}>
                      <Text style={[styles.timeText, { color: textColor }]}>{label}</Text>
                      {isBooked && (
                        <Text style={styles.bookedLabel}>Booked · tap to cancel</Text>
                      )}
                      {calBusy && !isBooked && !isAdded && (
                        <Text style={[styles.calBusyLabel, { color: colors.lavenderMid }]} numberOfLines={1}>
                          {calBusy.title}
                        </Text>
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

      {/* ── Calendar picker modal ────────────────────────────── */}
      <Modal
        visible={calPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCalPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCalPickerVisible(false)}
        >
          <View style={[styles.calPickerCard, { backgroundColor: "#fff" }]}>
            <View style={styles.calPickerHeader}>
              <Text style={styles.modalTitle}>Choose a calendar</Text>
              <TouchableOpacity onPress={() => setCalPickerVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={20} color="#7B5EA7" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Your busy times from this calendar will be highlighted in the availability grid.
            </Text>
            {calendars.length === 0 ? (
              <View style={styles.calEmptyState}>
                <Feather name="calendar" size={32} color="#DDD0F0" />
                <Text style={styles.calEmptyText}>
                  No calendars found. Make sure your Google or Apple Calendar is synced to this device.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {calendars.map((cal) => {
                  const isLinked = linkedCalendar?.id === cal.id;
                  return (
                    <TouchableOpacity
                      key={cal.id}
                      style={[
                        styles.calPickerRow,
                        isLinked && { backgroundColor: "#F5F0FF" },
                      ]}
                      onPress={async () => {
                        await linkCalendar(cal.id);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setCalPickerVisible(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.calDot, { backgroundColor: cal.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.calPickerName}>{cal.title}</Text>
                        <Text style={styles.calPickerSource}>{cal.source}</Text>
                      </View>
                      {isLinked && <Feather name="check" size={16} color="#2D1B69" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
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
  // ── Calendar UI ────────────────────────────────────────────
  calBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  calIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  calBannerTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 1,
  },
  calBannerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  calBusyLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  calPickerCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "75%",
    marginTop: "auto",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  calPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 2,
  },
  calDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    flexShrink: 0,
  },
  calPickerName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#2D1B69",
    marginBottom: 2,
  },
  calPickerSource: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#7B5EA7",
  },
  calEmptyState: {
    alignItems: "center",
    padding: 24,
    gap: 10,
  },
  calEmptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#7B5EA7",
    textAlign: "center",
    lineHeight: 20,
  },
});
