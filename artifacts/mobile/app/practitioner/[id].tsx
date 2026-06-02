import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Practitioner, Review } from "@/constants/data";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  FSAvailabilitySlot,
  FSPractitionerProfile,
  FSService,
  FSWaiverTemplate,
  createConversation,
  createOrJoinRetreatChat,
  getPractitionerProfileByNumericId,
  getWaiverByNumericId,
  markSlotBooked,
  profileToPractitioner,
  saveWaiverSignature,
  subscribeAvailability,
  subscribeServices,
} from "@/lib/firestore";
import { usePaymentSheet } from "@/hooks/usePaymentSheet";
import { scheduleBookingReminders, ReminderResult } from "@/utils/notifications";

type Screen = "detail" | "booking" | "confirmed";

export default function PractitionerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, email: userEmail, favorites, toggleFavorite, following, toggleFollowing, addBooking, bookings, userReviews, addReview, userName } = useApp();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  const [screen, setScreen] = useState<Screen>("detail");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reminders, setReminders] = useState<ReminderResult | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Reviews state
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [writeReviewOpen, setWriteReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  // Availability state
  const [availSlots, setAvailSlots] = useState<FSAvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Services state
  const [services, setServices] = useState<FSService[]>([]);
  const [selectedService, setSelectedService] = useState<FSService | null>(null);

  // Firestore profile (only real practitioners — no static fallback)
  const [firestoreProfile, setFirestoreProfile] = useState<FSPractitionerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Waiver state
  const [waiverTemplate, setWaiverTemplate] = useState<FSWaiverTemplate | null>(null);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [waiverSignedName, setWaiverSignedName] = useState("");
  const [waiverAgreed, setWaiverAgreed] = useState(false);
  const [waiverSigned, setWaiverSigned] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const practitioner: Practitioner | null = firestoreProfile
    ? (profileToPractitioner(firestoreProfile) as Practitioner)
    : null;

  // Always load from Firestore
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadingProfile(true);
    getPractitionerProfileByNumericId(Number(id)).then((profile) => {
      if (cancelled) return;
      setFirestoreProfile(profile);
      setLoadingProfile(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  // ── Availability subscription ────────────────────────────────────────────
  useEffect(() => {
    if (!practitioner) return;
    setLoadingSlots(true);
    const unsub = subscribeAvailability(practitioner.id, (slots) => {
      setAvailSlots(slots);
      setLoadingSlots(false);
    });
    return unsub;
  }, [practitioner?.id]);

  // ── Waiver template ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!practitioner) return;
    getWaiverByNumericId(practitioner.id).then(setWaiverTemplate).catch(() => {});
  }, [practitioner?.id]);

  // ── Services subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!practitioner) return;
    return subscribeServices(practitioner.id, (svcs) => {
      setServices(svcs);
      setSelectedService((prev) => {
        if (!prev) return null;
        return svcs.find((s) => s.id === prev.id) ?? null;
      });
    });
  }, [practitioner?.id]);

  // ── Derived availability (must be before any early returns — React hook rules) ──
  const availDates = useMemo(() => {
    const map = new Map<string, { label: string; iso: string; hasOpen: boolean }>();
    for (const slot of availSlots) {
      if (!map.has(slot.dateISO)) {
        map.set(slot.dateISO, { label: slot.date, iso: slot.dateISO, hasOpen: false });
      }
      if (!slot.booked) map.get(slot.dateISO)!.hasOpen = true;
    }
    return [...map.values()];
  }, [availSlots]);

  const timesForDate = useMemo((): FSAvailabilitySlot[] => {
    if (!selectedDate) return [];
    return availSlots.filter((s) => s.date === selectedDate);
  }, [availSlots, selectedDate]);

  if (loadingProfile) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.softWhite }}>
        <ActivityIndicator color={colors.purpleMid} size="large" />
      </View>
    );
  }

  if (!practitioner) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Practitioner not found</Text>
      </View>
    );
  }

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime) return;
    setPaymentError(null);
    setPaymentLoading(true);

    try {
      // ── Step 1: Create PaymentIntent on the server ──────────────────────
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
      const resp = await fetch(`${apiUrl}/api/payments/create-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: (selectedService?.price ?? practitioner.price) * 100,
          currency: "gbp",
          description: `Soul Remembrance · ${selectedService?.name ?? "Session"} with ${practitioner.name}`,
          practitionerId: practitioner.id,
          practitionerName: practitioner.name,
          ...(firestoreProfile?.stripeAccountId
            ? { stripeAccountId: firestoreProfile.stripeAccountId }
            : {}),
        }),
      });

      if (!resp.ok) {
        const { error } = await resp.json();
        throw new Error(error ?? "Failed to create payment");
      }

      const { clientSecret } = await resp.json();

      // ── Step 2: Initialise the payment sheet ────────────────────────────
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Soul Remembrance",
        style: "alwaysDark",
        appearance: {
          colors: {
            primary: "#6B4FA8",
            background: "#2D1B69",
            componentBackground: "#3D2496",
            componentText: "#FFFFFF",
            primaryText: "#FFFFFF",
            secondaryText: "rgba(255,255,255,0.65)",
          },
        },
      });
      if (initError) throw new Error(initError.message);

      // ── Step 3: Present the payment sheet ──────────────────────────────
      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if (payError.code === "Canceled") {
          setPaymentLoading(false);
          return; // user dismissed — do nothing
        }
        throw new Error(payError.message);
      }

      // ── Step 4: Payment succeeded — save booking ────────────────────────
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const bookingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const slot = timesForDate.find((s) => s.time === selectedTime);
      if (slot && userId) markSlotBooked(slot.id, userId).catch(console.warn);

      addBooking({
        id: bookingId,
        practitionerId: practitioner.id,
        practitionerName: practitioner.name,
        practitionerInitials: practitioner.initials,
        avatarColor: practitioner.avatarColor,
        date: selectedDate,
        time: selectedTime,
        price: selectedService?.price ?? practitioner.price,
        online: selectedService ? selectedService.online : practitioner.online,
        location: practitioner.location,
        confirmedAt: new Date().toISOString(),
        serviceName: selectedService?.name,
        serviceDuration: selectedService?.durationMinutes,
      });

      // ── Step 5: Create messaging conversation ───────────────────────────
      if (userId) {
        if (selectedService?.isRetreat && selectedService.id) {
          const initials = userName
            ? userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
            : "?";
          createOrJoinRetreatChat(
            userId,
            userName ?? "Member",
            initials,
            selectedService.id,
            practitioner.id,
            practitioner.name,
            practitioner.initials,
            practitioner.avatarColor as [string, string],
            selectedService.name
          ).catch(console.warn);
        } else {
          createConversation(
            userId,
            practitioner.id,
            practitioner.name,
            practitioner.initials,
            practitioner.avatarColor as [string, string]
          ).catch(console.warn);
        }
      }

      // ── Step 6: Send booking confirmation emails ─────────────────────────
      if (userEmail) {
        const bookingRef = `SR-${bookingId.split("-")[1]?.toUpperCase().slice(0, 6) ?? bookingId.slice(-6).toUpperCase()}`;
        const price = selectedService?.price ?? practitioner.price;
        const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
        fetch(`${apiUrl}/api/emails/booking-confirmation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientEmail: userEmail,
            clientName: userName || "Valued Client",
            practitionerEmail: firestoreProfile?.email,
            practitionerName: practitioner.name,
            serviceName: selectedService?.name ?? practitioner.title,
            sessionDate: selectedDate ?? "",
            sessionTime: selectedTime ?? "",
            duration: selectedService?.durationMinutes
              ? `${selectedService.durationMinutes} minutes`
              : "60 minutes",
            sessionFormat:
              (selectedService ? selectedService.online : practitioner.online)
                ? "Online"
                : "In-Person",
            amountPaid: `£${price}`,
            bookingRef,
          }),
        }).catch(console.warn);
      }

      // ── Step 7: Server sends push to both client + practitioner ─────────
      if (userId && firestoreProfile?.userId) {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
        fetch(`${apiUrl}/api/notifications/booking-confirmed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientUserId: userId,
            practitionerUserId: firestoreProfile.userId,
            practitionerName: practitioner.name,
            clientName: userName || "A client",
            serviceName: selectedService?.name ?? practitioner.title,
            sessionDate: selectedDate ?? "",
            sessionTime: selectedTime ?? "",
          }),
        }).catch(() => {});
      }

      const result = await scheduleBookingReminders(
        bookingId,
        practitioner.name,
        selectedDate,
        selectedTime
      );
      setReminders(result);
      setScreen("confirmed");
    } catch (err: any) {
      setPaymentError(err.message ?? "Payment failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Waiver flow ───────────────────────────────────────────────────────────
  const handleBookingPress = () => {
    if (waiverTemplate && !waiverSigned) {
      setShowWaiverModal(true);
    } else {
      handleConfirmBooking();
    }
  };

  const handleWaiverSign = () => {
    if (!waiverAgreed || !waiverSignedName.trim() || !waiverTemplate || !practitioner) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (userId) {
      saveWaiverSignature({
        userId,
        templateId: waiverTemplate.id,
        practitionerNumericId: practitioner.id,
        practitionerName: practitioner.name,
        waiverTitle: waiverTemplate.title,
        signedName: waiverSignedName.trim(),
      }).catch(console.warn);
    }
    setWaiverSigned(true);
    setShowWaiverModal(false);
    handleConfirmBooking();
  };

  // ── Reviews computed values ──────────────────────────────
  const allReviews: Review[] = userReviews.filter((r) => r.practitionerId === practitioner.id);
  const avgRating =
    allReviews.length
      ? Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) * 10) / 10
      : practitioner.rating;
  const visibleReviews = showAllReviews ? allReviews : allReviews.slice(0, 3);

  const handleSubmitReview = () => {
    if (!reviewRating || !reviewText.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    addReview({
      id: `ur-${Date.now()}`,
      practitionerId: practitioner.id,
      authorName: userName,
      authorInitials: userName.slice(0, 2).toUpperCase(),
      avatarColor: [colors.deepIndigo, colors.lavenderMid] as [string, string],
      rating: reviewRating,
      text: reviewText.trim(),
      date: `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`,
      verified: bookings.some((b) => b.practitionerId === practitioner.id),
    });
    setReviewRating(0);
    setReviewText("");
    setWriteReviewOpen(false);
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
          {selectedService?.isRetreat && (
            <View style={[styles.noticeBanner, { backgroundColor: `${colors.warmGold}15`, borderColor: `${colors.warmGold}40`, borderWidth: 1, marginTop: 12 }]}>
              <View style={[styles.reminderIconWrap, { backgroundColor: colors.warmGold }]}>
                <Feather name="users" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reminderTitle, { color: colors.warmGold }]}>
                  You're in the retreat chat!
                </Text>
                <Text style={[styles.noticeText, { color: colors.sage }]}>
                  Head to Messages to connect with other attendees in your group.
                </Text>
              </View>
            </View>
          )}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.deepIndigo }]}
            onPress={() => { setScreen("detail"); router.back(); }}
          >
            <Text style={styles.primaryBtnText}>Back to Explore</Text>
          </TouchableOpacity>
          {selectedService?.isRetreat && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.warmGold, marginTop: 10 }]}
              onPress={() => { router.push("/(tabs)/messages" as any); }}
            >
              <Text style={styles.primaryBtnText}>Go to Group Chat</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  if (screen === "booking") {
    const effectivePrice = selectedService?.price ?? practitioner.price;
    const canConfirm =
      !!selectedDate &&
      !!selectedTime &&
      (services.length === 0 || !!selectedService);
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
          {services.length > 0 && (
            <>
              <Text style={[styles.pickLabel, { color: colors.warmGold }]}>SELECT SERVICE</Text>
              {services.map((svc) => {
                const active = selectedService?.id === svc.id;
                return (
                  <TouchableOpacity
                    key={svc.id}
                    style={[
                      styles.serviceCard,
                      {
                        backgroundColor: active ? colors.deepIndigo : colors.card,
                        borderColor: active ? colors.deepIndigo : colors.blush,
                      },
                    ]}
                    onPress={() => {
                      setSelectedService(active ? null : svc);
                      Haptics.selectionAsync();
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.svcName, { color: active ? "#fff" : colors.charcoal }]}>
                        {svc.name}
                      </Text>
                      {svc.description ? (
                        <Text
                          style={[styles.svcDesc, { color: active ? "rgba(255,255,255,0.7)" : colors.sage }]}
                          numberOfLines={2}
                        >
                          {svc.description}
                        </Text>
                      ) : null}
                      <View style={styles.svcTagRow}>
                        <View
                          style={[
                            styles.svcTag,
                            { backgroundColor: active ? "rgba(255,255,255,0.2)" : `${colors.deepIndigo}14` },
                          ]}
                        >
                          <Feather name="clock" size={10} color={active ? "rgba(255,255,255,0.8)" : colors.deepIndigo} />
                          <Text style={[styles.svcTagText, { color: active ? "rgba(255,255,255,0.8)" : colors.deepIndigo }]}>
                            {svc.durationMinutes < 60
                              ? `${svc.durationMinutes} min`
                              : svc.durationMinutes === 60
                              ? "1 hour"
                              : `${svc.durationMinutes / 60}h`}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.svcTag,
                            { backgroundColor: active ? "rgba(255,255,255,0.2)" : `${colors.deepIndigo}14` },
                          ]}
                        >
                          <Feather
                            name={svc.online ? "video" : "map-pin"}
                            size={10}
                            color={active ? "rgba(255,255,255,0.8)" : colors.deepIndigo}
                          />
                          <Text style={[styles.svcTagText, { color: active ? "rgba(255,255,255,0.8)" : colors.deepIndigo }]}>
                            {svc.online ? "Online" : "In-person"}
                          </Text>
                        </View>
                        {svc.isRetreat && (
                          <View
                            style={[
                              styles.svcTag,
                              { backgroundColor: active ? "rgba(201,168,76,0.3)" : `${colors.warmGold}18` },
                            ]}
                          >
                            <Feather name="users" size={10} color={active ? "#F5D97A" : colors.warmGold} />
                            <Text style={[styles.svcTagText, { color: active ? "#F5D97A" : colors.warmGold }]}>
                              Group retreat
                            </Text>
                          </View>
                        )}
                      </View>
                      {svc.isRetreat && active && (
                        <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 6 }}>
                          You'll join a shared group chat with other attendees
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.svcPrice, { color: active ? "#fff" : colors.deepIndigo }]}>
                      £{svc.price % 1 === 0 ? svc.price : svc.price.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          <Text style={[styles.pickLabel, { color: colors.warmGold }]}>SELECT DATE</Text>

          {loadingSlots ? (
            <View style={styles.slotsLoader}>
              <ActivityIndicator size="small" color={colors.deepIndigo} />
              <Text style={[styles.slotsLoaderText, { color: colors.sage }]}>Loading availability…</Text>
            </View>
          ) : availDates.length === 0 ? (
            <View style={[styles.noSlotsBox, { backgroundColor: colors.card, borderColor: colors.cream }]}>
              <Text style={[styles.noSlotsText, { color: colors.sage }]}>No availability in the next 3 weeks.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 22 }}>
              {availDates.map((d) => {
                const isSelected = selectedDate === d.label;
                const isFull = !d.hasOpen;
                return (
                  <TouchableOpacity
                    key={d.iso}
                    disabled={isFull}
                    onPress={() => {
                      setSelectedDate(d.label);
                      setSelectedTime(null);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.dateChip,
                      {
                        backgroundColor: isSelected ? colors.deepIndigo : isFull ? colors.cream : colors.card,
                        borderColor: isSelected ? colors.deepIndigo : isFull ? colors.blush : colors.blush,
                        opacity: isFull ? 0.55 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.dateChipText, { color: isSelected ? "#fff" : isFull ? colors.sage : colors.charcoal }]}>
                      {d.label}
                    </Text>
                    {isFull && (
                      <Text style={[styles.dateChipFull, { color: colors.sage }]}>Full</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <Text style={[styles.pickLabel, { color: colors.warmGold }]}>SELECT TIME</Text>
          {!selectedDate ? (
            <Text style={[styles.pickHint, { color: colors.sage }]}>Select a date first to see available times</Text>
          ) : (
            <View style={styles.timesGrid}>
              {timesForDate.map((slot) => {
                const isSelected = selectedTime === slot.time;
                return (
                  <TouchableOpacity
                    key={slot.id}
                    disabled={slot.booked}
                    onPress={() => { setSelectedTime(slot.time); Haptics.selectionAsync(); }}
                    style={[
                      styles.timeChip,
                      {
                        backgroundColor: isSelected ? colors.deepIndigo : slot.booked ? colors.cream : colors.card,
                        borderColor: isSelected ? colors.deepIndigo : slot.booked ? colors.blush : colors.blush,
                        opacity: slot.booked ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.timeChipText, { color: isSelected ? "#fff" : slot.booked ? colors.sage : colors.charcoal }]}>
                      {slot.time}
                    </Text>
                    {slot.booked && (
                      <Text style={[styles.timeChipBooked, { color: colors.sage }]}>Booked</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.cream }]}>
            <Text style={[styles.pickLabel, { color: colors.warmGold }]}>SESSION SUMMARY</Text>
            {[
              { label: "Practitioner", value: practitioner.name },
              ...(selectedService
                ? [
                    { label: "Service", value: selectedService.name },
                    {
                      label: "Duration",
                      value:
                        selectedService.durationMinutes < 60
                          ? `${selectedService.durationMinutes} min`
                          : selectedService.durationMinutes === 60
                          ? "1 hour"
                          : `${selectedService.durationMinutes / 60}h`,
                    },
                  ]
                : []),
              { label: "Date", value: selectedDate || "—" },
              { label: "Time", value: selectedTime || "—" },
              {
                label: "Format",
                value: selectedService
                  ? selectedService.online
                    ? "Online"
                    : "In-person"
                  : practitioner.online
                  ? "Online"
                  : practitioner.location,
              },
              { label: "Total", value: `£${effectivePrice}` },
            ].map((row, i, arr) => (
              <View
                key={row.label}
                style={[
                  styles.summaryRow,
                  { borderBottomColor: colors.cream },
                  i === arr.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={[styles.summaryRowLabel, { color: colors.sage }]}>{row.label}</Text>
                <Text style={[styles.summaryRowValue, { color: colors.charcoal }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.bookFooter, { paddingBottom: bottomPad + 12, backgroundColor: colors.softWhite, borderTopColor: colors.cream }]}>
          {paymentError && (
            <Text style={[styles.paymentError, { color: "#E53E3E" }]}>{paymentError}</Text>
          )}
          <TouchableOpacity
            onPress={handleBookingPress}
            disabled={!canConfirm || paymentLoading}
            style={[
              styles.confirmBtn,
              { backgroundColor: canConfirm && !paymentLoading ? colors.deepIndigo : colors.blush },
            ]}
          >
            {paymentLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.confirmBtnText}>Pay £{effectivePrice} · Confirm Booking</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Waiver Signing Modal ─────────────────────────────────────── */}
        <Modal visible={showWaiverModal} animationType="slide" transparent>
          <View style={styles.waiverOverlay}>
            <View style={[styles.waiverSheet, { backgroundColor: colors.softWhite }]}>
              {/* Sheet header */}
              <View style={[styles.waiverSheetHeader, { borderBottomColor: colors.cream }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="file-text" size={16} color={colors.deepIndigo} />
                  <Text style={[styles.waiverSheetTitle, { color: colors.charcoal }]}>
                    Waiver & Consent Form
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowWaiverModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={20} color={colors.sage} />
                </TouchableOpacity>
              </View>

              {/* Waiver title */}
              <Text style={[styles.waiverDocTitle, { color: colors.deepIndigo }]}>
                {waiverTemplate?.title}
              </Text>
              <Text style={[styles.waiverPractName, { color: colors.sage }]}>
                Issued by {practitioner?.name}
              </Text>

              {/* Waiver body */}
              <ScrollView style={styles.waiverBodyScroll} showsVerticalScrollIndicator>
                <Text style={[styles.waiverBodyText, { color: colors.charcoal }]}>
                  {waiverTemplate?.content}
                </Text>
                <View style={{ height: 12 }} />
              </ScrollView>

              <View style={styles.waiverFooter}>
                {/* Agree checkbox */}
                <TouchableOpacity
                  style={styles.waiverCheckRow}
                  onPress={() => setWaiverAgreed((v) => !v)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.waiverCheckBox,
                      {
                        borderColor: colors.deepIndigo,
                        backgroundColor: waiverAgreed ? colors.deepIndigo : "transparent",
                      },
                    ]}
                  >
                    {waiverAgreed && <Feather name="check" size={11} color="#fff" />}
                  </View>
                  <Text style={[styles.waiverCheckLabel, { color: colors.charcoal }]}>
                    I have read and agree to this waiver
                  </Text>
                </TouchableOpacity>

                {/* Signature input */}
                <Text style={[styles.waiverSigLabel, { color: colors.sage }]}>
                  Type your full name to sign
                </Text>
                <TextInput
                  style={[
                    styles.waiverSigInput,
                    {
                      borderColor: waiverSignedName.trim() ? colors.deepIndigo : colors.blush,
                      color: colors.charcoal,
                      backgroundColor: colors.cream,
                      fontStyle: waiverSignedName.trim() ? "italic" : "normal",
                    },
                  ]}
                  placeholder="Your full name"
                  placeholderTextColor={colors.sage}
                  value={waiverSignedName}
                  onChangeText={setWaiverSignedName}
                  autoCapitalize="words"
                />

                {/* Sign button */}
                <TouchableOpacity
                  style={[
                    styles.waiverSignBtn,
                    {
                      backgroundColor:
                        waiverAgreed && waiverSignedName.trim()
                          ? colors.deepIndigo
                          : colors.blush,
                    },
                  ]}
                  disabled={!waiverAgreed || !waiverSignedName.trim()}
                  onPress={handleWaiverSign}
                >
                  <Feather name="lock" size={14} color="#fff" />
                  <Text style={styles.waiverSignBtnText}>Sign & Continue to Payment</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Detail screen
  const isFav = favorites.has(practitioner.id);
  const isFollowing = following.has(practitioner.id);
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
                onPress={() => { toggleFollowing(practitioner.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.followPill, isFollowing && styles.followPillActive]}
              >
                {isFollowing && <Feather name="check" size={11} color="#fff" style={{ marginRight: 4 }} />}
                <Text style={[styles.followPillText, isFollowing && { color: "#fff" }]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { toggleFavorite(practitioner.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={styles.backBtn}
              >
                <Feather name="heart" size={18} color={isFav ? "#ff6b6b" : "rgba(255,255,255,0.85)"} />
              </TouchableOpacity>
            </View>
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

        {/* ── REVIEWS SECTION ───────────────────────────────── */}
        <View style={styles.reviewsSection}>
          {/* Header */}
          <View style={styles.reviewsSectionHeader}>
            <Text style={[styles.bioLabel, { color: colors.warmGold }]}>REVIEWS</Text>
            <Text style={[styles.reviewCountLabel, { color: colors.sage }]}>
              {allReviews.length} review{allReviews.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {/* Rating summary card */}
          <View style={[styles.ratingSummaryCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
            <View style={styles.ratingLeft}>
              <Text style={[styles.ratingBigNum, { color: colors.charcoal }]}>{avgRating.toFixed(1)}</Text>
              <View style={styles.ratingStarsRow}>
                {[1,2,3,4,5].map((s) => (
                  <Feather
                    key={s}
                    name="star"
                    size={13}
                    color={s <= Math.round(avgRating) ? colors.gold : colors.blush}
                  />
                ))}
              </View>
              <Text style={[styles.ratingTotalLabel, { color: colors.sage }]}>
                {allReviews.length} total
              </Text>
            </View>
            <View style={styles.ratingBarsCol}>
              {([5,4,3,2,1] as const).map((star) => {
                const cnt = allReviews.filter((r) => r.rating === star).length;
                const pct = allReviews.length ? cnt / allReviews.length : 0;
                return (
                  <View key={star} style={styles.ratingBarRow}>
                    <Text style={[styles.ratingBarStar, { color: colors.sage }]}>{star}★</Text>
                    <View style={[styles.ratingBarTrack, { backgroundColor: colors.cream }]}>
                      <View
                        style={[
                          styles.ratingBarFill,
                          { backgroundColor: colors.gold, width: `${Math.round(pct * 100)}%` as any },
                        ]}
                      />
                    </View>
                    <Text style={[styles.ratingBarCnt, { color: colors.sage }]}>{cnt}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Review cards */}
          {visibleReviews.map((review) => (
            <View
              key={review.id}
              style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.cream }]}
            >
              <View style={styles.reviewCardHeader}>
                <LinearGradient colors={review.avatarColor} style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>{review.authorInitials}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <View style={styles.reviewNameRow}>
                    <Text style={[styles.reviewAuthor, { color: colors.charcoal }]}>{review.authorName}</Text>
                    {review.verified && (
                      <View style={[styles.verifiedSmall, { backgroundColor: `${colors.deepIndigo}18` }]}>
                        <Feather name="check" size={9} color={colors.deepIndigo} />
                        <Text style={[styles.verifiedSmallText, { color: colors.deepIndigo }]}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.reviewMeta}>
                    <View style={styles.reviewStars}>
                      {[1,2,3,4,5].map((s) => (
                        <Feather
                          key={s}
                          name="star"
                          size={11}
                          color={s <= review.rating ? colors.gold : colors.blush}
                        />
                      ))}
                    </View>
                    <Text style={[styles.reviewDate, { color: colors.sage }]}>{review.date}</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.reviewText, { color: colors.charcoal }]}>{review.text}</Text>
            </View>
          ))}

          {/* Show all / collapse */}
          {allReviews.length > 3 && (
            <TouchableOpacity
              onPress={() => { setShowAllReviews((v) => !v); Haptics.selectionAsync(); }}
              style={[styles.seeAllBtn, { borderColor: colors.blush }]}
            >
              <Text style={[styles.seeAllText, { color: colors.deepIndigo }]}>
                {showAllReviews ? "Show fewer reviews" : `See all ${allReviews.length} reviews`}
              </Text>
              <Feather
                name={showAllReviews ? "chevron-up" : "chevron-down"}
                size={14}
                color={colors.deepIndigo}
              />
            </TouchableOpacity>
          )}

          {/* Write a review */}
          {!writeReviewOpen ? (
            <TouchableOpacity
              onPress={() => { setWriteReviewOpen(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.writeReviewBtn, { borderColor: colors.blush, backgroundColor: colors.cream }]}
            >
              <Feather name="edit-2" size={14} color={colors.deepIndigo} />
              <Text style={[styles.writeReviewBtnText, { color: colors.deepIndigo }]}>Write a Review</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.reviewForm, { backgroundColor: colors.card, borderColor: colors.cream }]}>
              <Text style={[styles.reviewFormTitle, { color: colors.charcoal }]}>Your Review</Text>

              {/* Star picker */}
              <View style={styles.starPicker}>
                {[1,2,3,4,5].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => { setReviewRating(s); Haptics.selectionAsync(); }}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Feather
                      name="star"
                      size={34}
                      color={s <= reviewRating ? colors.gold : colors.blush}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {reviewRating > 0 && (
                <Text style={[styles.ratingHint, { color: colors.sage }]}>
                  {["","Not for me","It was okay","Good session","Really helpful","Absolutely transformative"][reviewRating]}
                </Text>
              )}

              {/* Text input */}
              <TextInput
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={4}
                placeholder="Share your experience with this practitioner…"
                placeholderTextColor={colors.sage}
                style={[
                  styles.reviewInput,
                  { color: colors.charcoal, borderColor: colors.blush, backgroundColor: colors.softWhite },
                ]}
                textAlignVertical="top"
              />

              {/* Actions */}
              <View style={styles.reviewFormActions}>
                <TouchableOpacity
                  onPress={() => { setWriteReviewOpen(false); setReviewRating(0); setReviewText(""); }}
                  style={[styles.reviewCancelBtn, { borderColor: colors.blush }]}
                >
                  <Text style={[styles.reviewCancelText, { color: colors.sage }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmitReview}
                  disabled={!reviewRating || !reviewText.trim()}
                  style={[
                    styles.reviewSubmitBtn,
                    {
                      backgroundColor:
                        reviewRating && reviewText.trim() ? colors.deepIndigo : colors.blush,
                    },
                  ]}
                >
                  <Text style={styles.reviewSubmitText}>Submit Review</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
          <Text style={styles.bookBtnText}>
            Book a Session{services.length === 0 ? ` · £${practitioner.price}` : ""}
          </Text>
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
  followPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  followPillActive: {
    backgroundColor: "#C9A84C",
    borderColor: "#C9A84C",
  },
  followPillText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
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
  serviceCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  svcName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  svcDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 7,
    lineHeight: 17,
  },
  svcTagRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  svcTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  svcTagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  svcPrice: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    flexShrink: 0,
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
  dateChipFull: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  slotsLoader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 22,
    paddingVertical: 8,
  },
  slotsLoaderText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  noSlotsBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 22,
    alignItems: "center",
  },
  noSlotsText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  pickHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 22,
    paddingVertical: 4,
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
  timeChipBooked: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
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
  paymentError: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  // Waiver modal
  waiverOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  waiverSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%", paddingBottom: 8 },
  waiverSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
  },
  waiverSheetTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  waiverDocTitle: { fontSize: 17, fontFamily: "Inter_700Bold", paddingHorizontal: 18, paddingTop: 14 },
  waiverPractName: { fontSize: 12, fontFamily: "Inter_400Regular", paddingHorizontal: 18, paddingBottom: 10 },
  waiverBodyScroll: { maxHeight: 180, paddingHorizontal: 18 },
  waiverBodyText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  waiverFooter: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4, gap: 12 },
  waiverCheckRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  waiverCheckBox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  waiverCheckLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  waiverSigLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  waiverSigInput: {
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, fontFamily: "Inter_600SemiBold",
  },
  waiverSignBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, paddingVertical: 14, marginBottom: 8,
  },
  waiverSignBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
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

  // ── Reviews ───────────────────────────────────────────
  reviewsSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  reviewsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  reviewCountLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  ratingSummaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    gap: 16,
    marginBottom: 14,
  },
  ratingLeft: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  ratingBigNum: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    lineHeight: 44,
  },
  ratingStarsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 4,
  },
  ratingTotalLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  ratingBarsCol: {
    flex: 1,
    justifyContent: "center",
    gap: 5,
  },
  ratingBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingBarStar: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    width: 22,
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  ratingBarFill: {
    height: 6,
    borderRadius: 3,
  },
  ratingBarCnt: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    width: 14,
    textAlign: "right",
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  reviewCardHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reviewAvatarText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  reviewNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 3,
  },
  reviewAuthor: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  verifiedSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedSmallText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  reviewMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewStars: {
    flexDirection: "row",
    gap: 2,
  },
  reviewDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  reviewText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  writeReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    marginTop: 2,
  },
  writeReviewBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  reviewForm: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 2,
  },
  reviewFormTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
  },
  starPicker: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    justifyContent: "center",
  },
  ratingHint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: 14,
  },
  reviewInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 96,
    lineHeight: 20,
    marginBottom: 14,
  },
  reviewFormActions: {
    flexDirection: "row",
    gap: 10,
  },
  reviewCancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
  },
  reviewCancelText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  reviewSubmitBtn: {
    flex: 2,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  reviewSubmitText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
