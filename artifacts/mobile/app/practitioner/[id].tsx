import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BOOKING_DATES, BOOKING_TIMES, PRACTITIONERS } from "@/constants/data";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { scheduleBookingReminders, ReminderResult } from "@/utils/notifications";

type Screen = "detail" | "booking" | "confirmed";

export default function PractitionerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite, addBooking } = useApp();

  const practitioner = PRACTITIONERS.find((p) => String(p.id) === id);
  const [screen, setScreen] = useState<Screen>("detail");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reminders, setReminders] = useState<ReminderResult | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!practitioner) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Practitioner not found</Text>
      </View>
    );
  }

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const bookingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    addBooking({
      id: bookingId,
      practitionerId: practitioner.id,
      practitionerName: practitioner.name,
      practitionerInitials: practitioner.initials,
      avatarColor: practitioner.avatarColor,
      date: selectedDate,
      time: selectedTime,
      price: practitioner.price,
      online: practitioner.online,
      location: practitioner.location,
      confirmedAt: new Date().toISOString(),
    });
    const result = await scheduleBookingReminders(
      bookingId,
      practitioner.name,
      selectedDate,
      selectedTime
    );
    setReminders(result);
    setScreen("confirmed");
  };

  if (screen === "confirmed") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
        <LinearGradient
          colors={[colors.deepIndigo, colors.lavenderMid]}
          style={[styles.confHeader, { paddingTop: topPad + 16 }]}
        >
          <View style={styles.confIconWrap}>
            <Feather name="check-circle" size={36} color="#fff" />
          </View>
          <Text style={styles.confTitle}>Booking Confirmed!</Text>
          <Text style={styles.confSub}>Your session has been booked</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
            <View style={[styles.summaryHeader, { borderBottomColor: colors.cream }]}>
              <LinearGradient colors={practitioner.avatarColor as [string, string]} style={styles.sumAvatar}>
                <Text style={styles.sumInitials}>{practitioner.initials}</Text>
              </LinearGradient>
              <View>
                <Text style={[styles.sumName, { color: colors.charcoal }]}>{practitioner.name}</Text>
                <Text style={[styles.sumTitle, { color: colors.sage }]}>{practitioner.title}</Text>
              </View>
            </View>
            {[
              { icon: "calendar", label: "Date", value: selectedDate! },
              { icon: "clock", label: "Time", value: selectedTime! },
              { icon: "pound-sign", label: "Total", value: `£${practitioner.price}` },
              { icon: practitioner.online ? "monitor" : "map-pin", label: "Format", value: practitioner.online ? "Online via Zoom" : practitioner.location },
            ].map((row, i) => (
              <View
                key={row.label}
                style={[
                  styles.summaryRow,
                  { borderBottomColor: colors.cream },
                  i === 3 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.summaryRowLeft}>
                  <Feather name={row.icon as any} size={15} color={colors.sage} />
                  <Text style={[styles.summaryRowLabel, { color: colors.sage }]}>{row.label}</Text>
                </View>
                <Text style={[styles.summaryRowValue, { color: colors.charcoal }]}>{row.value}</Text>
              </View>
            ))}
          </View>
          {/* Reminders banner */}
          {reminders && (reminders.dayBefore || reminders.hourBefore) ? (
            <View style={[styles.noticeBanner, { backgroundColor: `${colors.deepIndigo}12`, borderColor: `${colors.deepIndigo}30`, borderWidth: 1 }]}>
              <View style={[styles.reminderIconWrap, { backgroundColor: colors.deepIndigo }]}>
                <Feather name="bell" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reminderTitle, { color: colors.deepIndigo }]}>
                  Reminders set ✓
                </Text>
                <Text style={[styles.noticeText, { color: colors.sage }]}>
                  {reminders.dayBefore && reminders.hourBefore
                    ? "You'll be notified the day before at 9 AM, and again 1 hour before your session."
                    : reminders.hourBefore
                    ? "You'll be notified 1 hour before your session starts."
                    : "You'll be notified the day before your session at 9 AM."}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.noticeBanner, { backgroundColor: "#EEE5FF" }]}>
              <Feather name="mail" size={18} color={colors.deepIndigo} />
              <Text style={[styles.noticeText, { color: colors.deepIndigo }]}>
                {practitioner.online
                  ? "You'll receive a Zoom link 1 hour before your session."
                  : `Your session is at ${practitioner.location}. See you there.`}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.deepIndigo }]}
            onPress={() => { setScreen("detail"); router.back(); }}
          >
            <Text style={styles.primaryBtnText}>Back to Explore</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (screen === "booking") {
    const canConfirm = !!selectedDate && !!selectedTime;
    return (
      <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
        <LinearGradient
          colors={[colors.deepIndigo, colors.lavenderMid]}
          style={[styles.bookHeader, { paddingTop: topPad + 8 }]}
        >
          <TouchableOpacity onPress={() => setScreen("detail")} style={styles.backBtn}>
            <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
          <View style={styles.bookHeaderContent}>
            <LinearGradient colors={practitioner.avatarColor as [string, string]} style={styles.bookAvatar}>
              <Text style={styles.bookInitials}>{practitioner.initials}</Text>
            </LinearGradient>
            <View>
              <Text style={styles.bookTitle}>Book a Session</Text>
              <Text style={styles.bookSub}>with {practitioner.name}</Text>
            </View>
          </View>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 80 }}>
          <Text style={[styles.pickLabel, { color: colors.warmGold }]}>SELECT DATE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 22 }}>
            {BOOKING_DATES.map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => { setSelectedDate(d); Haptics.selectionAsync(); }}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: selectedDate === d ? colors.deepIndigo : colors.card,
                    borderColor: selectedDate === d ? colors.deepIndigo : colors.blush,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    { color: selectedDate === d ? "#fff" : colors.charcoal },
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.pickLabel, { color: colors.warmGold }]}>SELECT TIME</Text>
          <View style={styles.timesGrid}>
            {BOOKING_TIMES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => { setSelectedTime(t); Haptics.selectionAsync(); }}
                style={[
                  styles.timeChip,
                  {
                    backgroundColor: selectedTime === t ? colors.deepIndigo : colors.card,
                    borderColor: selectedTime === t ? colors.deepIndigo : colors.blush,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.timeChipText,
                    { color: selectedTime === t ? "#fff" : colors.charcoal },
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.cream }]}>
            <Text style={[styles.pickLabel, { color: colors.warmGold }]}>SESSION SUMMARY</Text>
            {[
              { label: "Practitioner", value: practitioner.name },
              { label: "Date", value: selectedDate || "—" },
              { label: "Time", value: selectedTime || "—" },
              { label: "Format", value: practitioner.online ? "Online via Zoom" : practitioner.location },
              { label: "Total", value: `£${practitioner.price}` },
            ].map((row, i) => (
              <View
                key={row.label}
                style={[
                  styles.summaryRow,
                  { borderBottomColor: colors.cream },
                  i === 4 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={[styles.summaryRowLabel, { color: colors.sage }]}>{row.label}</Text>
                <Text style={[styles.summaryRowValue, { color: colors.charcoal }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.bookFooter, { paddingBottom: bottomPad + 12, backgroundColor: colors.softWhite, borderTopColor: colors.cream }]}>
          <TouchableOpacity
            onPress={handleConfirmBooking}
            disabled={!canConfirm}
            style={[
              styles.confirmBtn,
              { backgroundColor: canConfirm ? colors.deepIndigo : colors.blush },
            ]}
          >
            <Text style={styles.confirmBtnText}>Confirm Booking · £{practitioner.price}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Detail screen
  const isFav = favorites.has(practitioner.id);
  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[colors.deepIndigo, colors.lavenderMid]}
          style={[styles.detailHeader, { paddingTop: topPad + 8 }]}
        >
          <View style={styles.detailHeaderActions}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { toggleFavorite(practitioner.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={styles.backBtn}
            >
              <Feather name="heart" size={18} color={isFav ? "#ff6b6b" : "rgba(255,255,255,0.85)"} />
            </TouchableOpacity>
          </View>

          <LinearGradient colors={practitioner.avatarColor as [string, string]} style={styles.detailAvatar}>
            <Text style={styles.detailInitials}>{practitioner.initials}</Text>
          </LinearGradient>
          <View style={styles.detailNameRow}>
            <Text style={styles.detailName}>{practitioner.name}</Text>
            {practitioner.verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.gold }]}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.detailTitle}>{practitioner.title}</Text>
          <View style={styles.detailMeta}>
            <View style={styles.metaChip}>
              <Feather name="map-pin" size={11} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metaChipText}>{practitioner.location}</Text>
            </View>
            <View style={styles.metaChip}>
              <Feather name="star" size={11} color={colors.gold} />
              <Text style={styles.metaChipText}>{practitioner.rating} ({practitioner.reviews} reviews)</Text>
            </View>
            {practitioner.online && (
              <View style={styles.metaChip}>
                <Feather name="monitor" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.metaChipText}>Online</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Price & next avail */}
        <View style={[styles.priceRow, { backgroundColor: colors.card, borderColor: colors.cream }]}>
          <View style={styles.priceItem}>
            <Text style={[styles.priceNum, { color: colors.deepIndigo }]}>£{practitioner.price}</Text>
            <Text style={[styles.priceLabel, { color: colors.sage }]}>per session</Text>
          </View>
          <View style={[styles.priceDivider, { backgroundColor: colors.cream }]} />
          <View style={styles.priceItem}>
            <Text style={[styles.priceNum, { color: practitioner.nextAvail === "Today" ? colors.deepIndigo : colors.charcoal }]}>
              {practitioner.nextAvail}
            </Text>
            <Text style={[styles.priceLabel, { color: colors.sage }]}>next available</Text>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          <Text style={[styles.bioLabel, { color: colors.warmGold }]}>ABOUT</Text>
          <Text style={[styles.bioText, { color: colors.charcoal }]}>{practitioner.bio}</Text>

          <Text style={[styles.bioLabel, { color: colors.warmGold, marginTop: 20 }]}>MODALITIES</Text>
          <View style={styles.modalityList}>
            {practitioner.modalities.map((m) => (
              <View key={m} style={[styles.modalityChip, { backgroundColor: colors.cream, borderColor: colors.blush }]}>
                <Feather name="check" size={12} color={colors.deepIndigo} />
                <Text style={[styles.modalityText, { color: colors.deepIndigo }]}>{m}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.bioLabel, { color: colors.warmGold, marginTop: 20 }]}>TAGS</Text>
          <View style={styles.tagsRow}>
            {practitioner.tags.map((t) => (
              <View key={t} style={[styles.tag, { backgroundColor: `${colors.deepIndigo}14` }]}>
                <Text style={[styles.tagText, { color: colors.deepIndigo }]}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Book button */}
      <View style={[styles.bookBar, { paddingBottom: bottomPad + 10, backgroundColor: colors.softWhite, borderTopColor: colors.cream }]}>
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: colors.deepIndigo }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setScreen("booking");
          }}
        >
          <Feather name="calendar" size={18} color="#fff" />
          <Text style={styles.bookBtnText}>Book a Session · £{practitioner.price}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailHeader: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: "center",
  },
  detailHeaderActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  detailInitials: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  detailNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailName: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  verifiedBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  detailTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
    marginBottom: 14,
  },
  detailMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaChipText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  priceRow: {
    flexDirection: "row",
    margin: 20,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  priceItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
  },
  priceDivider: {
    width: 1,
  },
  priceNum: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  bioLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  bioText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  modalityList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalityChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
  },
  modalityText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  bookBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bookBtn: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  bookBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  // Booking screen
  bookHeader: {
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  bookHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 4,
  },
  bookAvatar: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  bookInitials: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  bookTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  bookSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  pickLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  dateChip: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1.5,
  },
  dateChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  timesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 22,
  },
  timeChip: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    minWidth: 80,
    alignItems: "center",
  },
  timeChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  summaryBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  summaryRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryRowLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  summaryRowValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  bookFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  confirmBtn: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  // Confirmed screen
  confHeader: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: "center",
  },
  confIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    marginTop: 20,
  },
  confTitle: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  confSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  sumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sumInitials: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  sumName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  sumTitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  noticeBanner: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  reminderIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reminderTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  primaryBtn: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
