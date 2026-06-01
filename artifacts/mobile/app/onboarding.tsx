import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarPicker } from "@/components/AvatarPicker";
import { MODALITIES } from "@/constants/data";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { savePractitionerProfile } from "@/lib/firestore";

type Step = 1 | 2 | 3 | 4 | 5;

interface OnboardingData {
  name: string;
  title: string;
  location: string;
  years: string;
  bio: string;
  modalities: string[];
  rate: string;
  agreedTerms: boolean;
  photoURL: string;
}

const STEP_LABELS = ["Your Practice", "Modalities", "Credentials", "Membership", "Complete"];

const DOC_TYPES = [
  { id: "qualification", label: "Qualification / Certificate", icon: "award" as const },
  { id: "insurance", label: "Professional Insurance", icon: "shield" as const },
  { id: "membership", label: "Professional Body", icon: "briefcase" as const },
  { id: "dbs", label: "DBS Check", icon: "check-circle" as const },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email, userId } = useApp();
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<OnboardingData>({
    name: "", title: "", location: "", years: "", bio: "",
    modalities: [], rate: "", agreedTerms: false, photoURL: "",
  });
  const [addedDocs, setAddedDocs] = useState<string[]>([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 5) setStep((s) => (s + 1) as Step);
  };
  const back = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) setStep((s) => (s - 1) as Step);
    else router.back();
  };

  // Opens Stripe Checkout for the £3.99/month trial subscription
  const startTrialAndContinue = async () => {
    if (!data.agreedTerms) return;
    setSubscriptionLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
      const appScheme = "mobile";

      const resp = await fetch(`${apiUrl}/api/payments/create-subscription-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name || "Practitioner",
          email: email ?? undefined,
          successUrl: `${appScheme}://subscription-success`,
          cancelUrl: `${appScheme}://subscription-cancel`,
        }),
      });

      if (!resp.ok) {
        const { error } = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error ?? "Could not start subscription");
      }

      const { url } = await resp.json();

      // Open Stripe Checkout — resolves when browser closes or redirects back
      const result = await WebBrowser.openAuthSessionAsync(url, `${appScheme}://`);

      if (
        result.type === "success" &&
        result.url?.includes("subscription-success")
      ) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        next();
        if (userId) {
          const nameParts = (data.name || "Practitioner").trim().split(/\s+/);
          const initials = nameParts.map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "PR";
          const locationParts = data.location.split(",").map((s) => s.trim());
          await savePractitionerProfile({
            userId,
            numericId: Date.now(),
            name: data.name || "Practitioner",
            initials,
            title: data.title || "Wellness Practitioner",
            location: data.location || "",
            city: locationParts[0] || "",
            country: locationParts[locationParts.length - 1] || "",
            bio: data.bio || "",
            modalities: data.modalities,
            rate: Number(data.rate) || 0,
            years: data.years || "",
            avatarColor: ["#2D1B69", "#7B5EA7"],
            rating: 0,
            reviewCount: 0,
            online: true,
            verified: false,
            subscriptionActive: true,
            ...(data.photoURL && { photoURL: data.photoURL }),
            email: email ?? undefined,
          });
        }
      } else if (result.type === "cancel" || result.type === "dismiss") {
        // User closed the browser — stay on step 4, no error shown
      } else {
        next(); // fallback: treat any other close as success
      }
    } catch (err: any) {
      Alert.alert(
        "Subscription Error",
        err.message ?? "Something went wrong. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };
  const toggleModality = (m: string) => {
    Haptics.selectionAsync();
    setData((d) => ({
      ...d,
      modalities: d.modalities.includes(m)
        ? d.modalities.filter((x) => x !== m)
        : [...d.modalities, m],
    }));
  };
  const toggleDoc = (id: string) => {
    setAddedDocs((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      {/* Progress */}
      <LinearGradient
        colors={[colors.deepIndigo, colors.lavenderMid]}
        style={[styles.progressHeader, { paddingTop: topPad + 8 }]}
      >
        <View style={styles.progressTop}>
          <TouchableOpacity onPress={back} style={styles.backBtn}>
            <Feather name="arrow-left" size={16} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
          <View style={styles.progressBarWrap}>
            {STEP_LABELS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  { backgroundColor: i < step ? "#fff" : "rgba(255,255,255,0.25)" },
                ]}
              />
            ))}
          </View>
          <Text style={styles.stepCounter}>{step}/5</Text>
        </View>
        <Text style={styles.stepLabel}>STEP {step} OF 5</Text>
        <Text style={styles.stepTitle}>{STEP_LABELS[step - 1]}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 80 }} showsVerticalScrollIndicator={false}>
        {/* Step 1: Practice Info */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepDesc, { color: colors.sage }]}>Tell us about yourself and your healing work</Text>
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <AvatarPicker
                userId={userId ?? "new"}
                photoURL={data.photoURL || null}
                initials={
                  data.name
                    ? data.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                    : "PR"
                }
                size={88}
                role="practitioner"
                onPhotoChange={(url) => setData((d) => ({ ...d, photoURL: url }))}
              />
              <Text style={[styles.stepDesc, { color: colors.sage, marginTop: 8, marginBottom: 0, fontSize: 12 }]}>
                Tap to add a profile photo
              </Text>
            </View>
            {[
              { label: "Full Name", placeholder: "e.g. Luna Ashford", key: "name" as const, icon: "user" as const },
              { label: "Practitioner Title", placeholder: "e.g. Sound Healer & Reiki Master", key: "title" as const, icon: "star" as const },
              { label: "Location", placeholder: "City, Country", key: "location" as const, icon: "map-pin" as const },
              { label: "Years of Practice", placeholder: "e.g. 5", key: "years" as const, icon: "calendar" as const },
            ].map((field) => (
              <View key={field.key} style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.warmGold }]}>{field.label.toUpperCase()}</Text>
                <View style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: data[field.key] ? colors.deepIndigo : colors.blush }]}>
                  <Feather name={field.icon} size={16} color={colors.sage} />
                  <TextInput
                    value={data[field.key]}
                    onChangeText={(v) => setData((d) => ({ ...d, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.sage}
                    style={[styles.fieldInput, { color: colors.charcoal }]}
                  />
                </View>
              </View>
            ))}
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.warmGold }]}>BIO</Text>
              <TextInput
                value={data.bio}
                onChangeText={(v) => setData((d) => ({ ...d, bio: v }))}
                placeholder="Share your healing journey and approach..."
                placeholderTextColor={colors.sage}
                multiline
                numberOfLines={4}
                style={[styles.bioInput, { backgroundColor: colors.card, borderColor: data.bio ? colors.deepIndigo : colors.blush, color: colors.charcoal }]}
              />
            </View>
          </View>
        )}

        {/* Step 2: Modalities */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepDesc, { color: colors.sage }]}>Select all healing practices you offer</Text>
            <View style={styles.modalityGrid}>
              {MODALITIES.map((m) => {
                const selected = data.modalities.includes(m);
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => toggleModality(m)}
                    style={[
                      styles.modalityChip,
                      { backgroundColor: selected ? colors.deepIndigo : colors.card, borderColor: selected ? colors.deepIndigo : colors.blush },
                    ]}
                  >
                    {selected && <Feather name="check" size={12} color="#fff" />}
                    <Text style={[styles.modalityChipText, { color: selected ? "#fff" : colors.charcoal }]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[styles.rateBox, { backgroundColor: colors.cream }]}>
              <Text style={[styles.fieldLabel, { color: colors.warmGold }]}>SESSION RATE</Text>
              <View style={styles.rateRow}>
                <Text style={[styles.rateCurrency, { color: colors.deepIndigo }]}>£</Text>
                <TextInput
                  value={data.rate}
                  onChangeText={(v) => setData((d) => ({ ...d, rate: v }))}
                  placeholder="e.g. 90"
                  placeholderTextColor={colors.sage}
                  keyboardType="numeric"
                  style={[styles.rateInput, { borderColor: data.rate ? colors.deepIndigo : colors.blush, color: colors.charcoal }]}
                />
                <Text style={[styles.rateUnit, { color: colors.sage }]}>per session</Text>
              </View>
              <Text style={[styles.rateNote, { color: colors.sage }]}>2.5% platform fee applies per booking</Text>
            </View>
          </View>
        )}

        {/* Step 3: Credentials */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepDesc, { color: colors.sage }]}>Build trust by verifying your credentials</Text>
            <View style={[styles.noticeBanner, { backgroundColor: `${colors.deepIndigo}10`, borderColor: colors.blush }]}>
              <Feather name="lock" size={18} color={colors.deepIndigo} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.noticeTitle, { color: colors.deepIndigo }]}>Why we verify credentials</Text>
                <Text style={[styles.noticeBody, { color: colors.sage }]}>
                  Verified practitioners receive a trust badge and rank higher in search.
                </Text>
              </View>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.warmGold }]}>ADD DOCUMENTS</Text>
            <View style={styles.docGrid}>
              {DOC_TYPES.map((dt) => {
                const added = addedDocs.includes(dt.id);
                return (
                  <TouchableOpacity
                    key={dt.id}
                    onPress={() => toggleDoc(dt.id)}
                    style={[
                      styles.docCard,
                      {
                        backgroundColor: added ? `${colors.deepIndigo}10` : colors.card,
                        borderColor: added ? colors.deepIndigo : colors.blush,
                      },
                    ]}
                  >
                    <View style={[styles.docIcon, { backgroundColor: `${colors.deepIndigo}15` }]}>
                      <Feather name={dt.icon} size={20} color={colors.deepIndigo} />
                    </View>
                    <Text style={[styles.docLabel, { color: colors.charcoal }]}>{dt.label}</Text>
                    <Text style={[styles.docAction, { color: added ? "#2ECC71" : colors.deepIndigo }]}>
                      {added ? "Added" : "+ Add"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[styles.skipNote, { backgroundColor: colors.cream }]}>
              <Feather name="info" size={15} color={colors.sage} />
              <Text style={[styles.skipText, { color: colors.sage }]}>
                You can skip this now and add documents later from your dashboard.
              </Text>
            </View>
          </View>
        )}

        {/* Step 4: Membership */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepDesc, { color: colors.sage }]}>Everything you need to grow your practice</Text>
            <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.deepIndigo }]}>
              <LinearGradient colors={[colors.deepIndigo, colors.lavenderMid]} style={styles.planHeader}>
                <View>
                  <View style={[styles.planBadge, { backgroundColor: colors.gold }]}>
                    <Text style={styles.planBadgeText}>PRACTITIONER</Text>
                  </View>
                  <Text style={styles.planName}>Monthly Plan</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.planPrice}>£3.99</Text>
                  <Text style={styles.planPriceUnit}>per month</Text>
                </View>
              </LinearGradient>
              <View style={styles.planFeatures}>
                {[
                  "Verified practitioner badge",
                  "Listed in Explore directory",
                  "Unlimited event & retreat listings",
                  "Booking & payment collection",
                  "Group chat & community tools",
                  "Analytics & earnings dashboard",
                ].map((f, i) => (
                  <View key={i} style={[styles.featureRow, i < 5 && { borderBottomWidth: 1, borderBottomColor: colors.cream }]}>
                    <Feather name="check" size={14} color={colors.deepIndigo} />
                    <Text style={[styles.featureText, { color: colors.charcoal }]}>{f}</Text>
                  </View>
                ))}
                <View style={styles.featureRow}>
                  <Feather name="plus" size={14} color={colors.purpleMid} />
                  <Text style={[styles.featureText, { color: colors.purpleMid }]}>2.5% fee on each booking</Text>
                </View>
              </View>
            </View>
            <View style={[styles.trialBanner, { backgroundColor: "#EEE5FF" }]}>
              <Feather name="gift" size={18} color={colors.deepIndigo} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.trialTitle, { color: colors.deepIndigo }]}>1-month free trial — no charge today</Text>
                <Text style={[styles.trialBody, { color: colors.sage }]}>
                  £3.99 begins after 30 days. Cancel anytime.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setData((d) => ({ ...d, agreedTerms: !d.agreedTerms }))}
              style={styles.termsRow}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: data.agreedTerms ? colors.deepIndigo : colors.blush, backgroundColor: data.agreedTerms ? colors.deepIndigo : "#fff" },
                ]}
              >
                {data.agreedTerms && <Feather name="check" size={12} color="#fff" />}
              </View>
              <Text style={[styles.termsText, { color: colors.sage }]}>
                I agree to the{" "}
                <Text style={{ color: colors.deepIndigo, fontFamily: "Inter_600SemiBold" }}>Practitioner Terms</Text>
                {" "}and understand the 2.5% booking fee and £3.99/mo subscription after my free trial.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 5: Complete */}
        {step === 5 && (
          <View style={[styles.stepContent, { alignItems: "center", paddingTop: 20 }]}>
            <View style={[styles.completeIcon, { backgroundColor: `${colors.deepIndigo}15` }]}>
              <Feather name="star" size={40} color={colors.deepIndigo} />
            </View>
            <Text style={[styles.completeTitle, { color: colors.charcoal }]}>You're In!</Text>
            <Text style={[styles.completeBody, { color: colors.sage }]}>
              Your practitioner profile is under review. You'll receive a notification once approved — usually within 24 hours.
            </Text>
            {[
              { icon: "check-circle", label: "Profile submitted for review" },
              { icon: "shield", label: "Credentials being verified" },
              { icon: "gift", label: "30-day free trial started" },
              { icon: "users", label: "Added to the community directory" },
            ].map((item) => (
              <View
                key={item.label}
                style={[styles.completeStep, { backgroundColor: colors.card, borderColor: colors.cream }]}
              >
                <Feather name={item.icon as any} size={18} color={colors.deepIndigo} />
                <Text style={[styles.completeStepText, { color: colors.charcoal }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 10, backgroundColor: colors.softWhite, borderTopColor: colors.cream }]}>
        {step < 5 ? (
          <View style={styles.footerRow}>
            {step > 1 && (
              <TouchableOpacity onPress={back} style={[styles.backFooterBtn, { borderColor: colors.blush }]}>
                <Text style={[styles.backFooterText, { color: colors.charcoal }]}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={step === 4 ? (data.agreedTerms ? startTrialAndContinue : undefined) : next}
              disabled={step === 4 && subscriptionLoading}
              style={[
                styles.nextBtn,
                { backgroundColor: step === 4 ? (data.agreedTerms ? colors.deepIndigo : colors.blush) : colors.deepIndigo, flex: step > 1 ? 2 : 1 },
              ]}
            >
              {step === 4 && subscriptionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>
                    {step === 4
                      ? "Start Free Trial"
                      : step === 3
                      ? (addedDocs.length > 0 ? `Submit ${addedDocs.length} Doc${addedDocs.length > 1 ? "s" : ""}` : "Skip for now")
                      : "Continue"}
                  </Text>
                  <Feather name="arrow-right" size={16} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.deepIndigo }]}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.nextBtnText}>Go to Dashboard</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressBarWrap: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepCounter: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  stepLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  stepTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  stepContent: {
    gap: 16,
  },
  stepDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 4,
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 13,
    gap: 10,
    borderWidth: 1.5,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  bioInput: {
    borderRadius: 14,
    padding: 13,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1.5,
    minHeight: 90,
    textAlignVertical: "top",
    lineHeight: 20,
  },
  modalityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalityChip: {
    borderRadius: 25,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
  },
  modalityChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  rateBox: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rateCurrency: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  rateInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    width: 90,
  },
  rateUnit: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  rateNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  noticeBanner: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  noticeBody: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  docGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  docCard: {
    width: "47%",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  docLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 15,
  },
  docAction: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  skipNote: {
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  skipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  planCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
  },
  planHeader: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  planBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  planName: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  planPrice: {
    color: "#fff",
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    lineHeight: 34,
  },
  planPriceUnit: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  planFeatures: {
    padding: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  trialBanner: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  trialTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  trialBody: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  completeIcon: {
    width: 90,
    height: 90,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  completeBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  completeStep: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  completeStepText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: "row",
    gap: 10,
  },
  backFooterBtn: {
    flex: 1,
    borderRadius: 16,
    padding: 15,
    alignItems: "center",
    borderWidth: 1.5,
  },
  backFooterText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  nextBtn: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
