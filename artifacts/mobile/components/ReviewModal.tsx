import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Review } from "@/constants/data";

export interface ReviewTarget {
  bookingId: string;
  practitionerId: number;
  practitionerName: string;
  practitionerInitials: string;
  avatarColor: [string, string];
}

interface ReviewModalProps {
  target: ReviewTarget | null;
  onClose: () => void;
  onSubmitted: (bookingId: string) => void;
}

export function ReviewModal({ target, onClose, onSubmitted }: ReviewModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addReview, displayName } = useApp();

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reset = useCallback(() => {
    setRating(0);
    setHoveredRating(0);
    setText("");
    setSubmitting(false);
    setSubmitted(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!target || rating === 0 || submitting) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const authorName = displayName ?? "Soul Seeker";
    const initials = authorName
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");

    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    const review: Review = {
      id: `rev-${target.bookingId}-${Date.now()}`,
      practitionerId: target.practitionerId,
      authorName,
      authorInitials: initials || "SR",
      avatarColor: ["#6B4FA8", "#9B7FD4"],
      rating,
      text: text.trim(),
      date: dateStr,
      verified: true,
    };

    addReview(review);
    setSubmitted(true);

    setTimeout(() => {
      onSubmitted(target.bookingId);
      reset();
      onClose();
    }, 1400);
  }, [target, rating, text, submitting, displayName, addReview, onSubmitted, reset, onClose]);

  const activeRating = hoveredRating || rating;

  return (
    <Modal
      visible={!!target}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.handle, { backgroundColor: colors.blush }]} />

          {submitted ? (
            <View style={styles.successContainer}>
              <View style={[styles.successCircle, { backgroundColor: `${colors.deepIndigo}18` }]}>
                <Feather name="check" size={36} color={colors.deepIndigo} />
              </View>
              <Text style={[styles.successTitle, { color: colors.charcoal }]}>Review submitted!</Text>
              <Text style={[styles.successSub, { color: colors.sage }]}>
                Thank you — your experience helps others find the right practitioner.
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sheetTitle, { color: colors.charcoal }]}>Leave a Review</Text>

              {target && (
                <View style={styles.practitionerRow}>
                  <LinearGradient colors={target.avatarColor} style={styles.practAvatar}>
                    <Text style={styles.practInitials}>{target.practitionerInitials}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.practName, { color: colors.charcoal }]}>{target.practitionerName}</Text>
                    <View style={[styles.verifiedBadge, { backgroundColor: `${colors.deepIndigo}14` }]}>
                      <Feather name="check-circle" size={11} color={colors.deepIndigo} />
                      <Text style={[styles.verifiedText, { color: colors.deepIndigo }]}>Verified session</Text>
                    </View>
                  </View>
                </View>
              )}

              <Text style={[styles.label, { color: colors.sage }]}>Your rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRating(n);
                    }}
                    onPressIn={() => setHoveredRating(n)}
                    onPressOut={() => setHoveredRating(0)}
                    activeOpacity={0.7}
                    style={styles.starBtn}
                  >
                    <Feather
                      name="star"
                      size={34}
                      color={n <= activeRating ? colors.warmGold : colors.blush}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <Text style={[styles.ratingLabel, { color: colors.warmGold }]}>
                  {["", "Poor", "Fair", "Good", "Great", "Excellent!"][rating]}
                </Text>
              )}

              <Text style={[styles.label, { color: colors.sage, marginTop: 18 }]}>Your experience</Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Share how the session felt for you…"
                placeholderTextColor={colors.sage}
                multiline
                maxLength={600}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.softWhite,
                    borderColor: colors.blush,
                    color: colors.charcoal,
                  },
                ]}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.sage }]}>{text.length}/600</Text>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor:
                      rating === 0 || submitting ? colors.blush : colors.deepIndigo,
                  },
                ]}
                onPress={handleSubmit}
                disabled={rating === 0 || submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="send" size={15} color={rating === 0 ? colors.sage : "#fff"} />
                    <Text style={[styles.submitText, { color: rating === 0 ? colors.sage : "#fff" }]}>
                      Submit Review
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 18,
    textAlign: "center",
  },
  practitionerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(45,27,105,0.05)",
  },
  practAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  practInitials: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
  },
  practName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 5,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "500",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  starsRow: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginBottom: 8,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 6,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 12,
  },
  successCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  successSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
