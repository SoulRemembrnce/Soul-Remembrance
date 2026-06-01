import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import {
  FSAvailabilitySlot,
  addAvailabilitySlot,
  deleteAvailabilitySlot,
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

    if (existing) {
      if (existing.booked) return;
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
              ? colors.cream
              : isAdded
              ? colors.deepIndigo
              : colors.softWhite;
            const borderColor = isBooked
              ? colors.blush
              : isAdded
              ? colors.deepIndigo
              : colors.blush;
            const textColor = isAdded && !isBooked ? "#fff" : colors.charcoal;
            const icon: "lock" | "check" | "plus" = isBooked ? "lock" : isAdded ? "check" : "plus";
            const iconColor = isAdded && !isBooked ? "rgba(255,255,255,0.7)" : isBooked ? colors.sage : colors.blush;

            return (
              <TouchableOpacity
                key={timeISO}
                style={[styles.timeSlot, { backgroundColor: bgColor, borderColor }]}
                onPress={() => handleToggleSlot(timeISO, label)}
                disabled={isBooked || isToggling}
                activeOpacity={0.75}
              >
                {isToggling ? (
                  <ActivityIndicator
                    size="small"
                    color={isAdded ? "#fff" : colors.deepIndigo}
                  />
                ) : (
                  <>
                    <Text style={[styles.timeText, { color: textColor }]}>{label}</Text>
                    <Feather name={icon} size={14} color={iconColor} />
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
});
