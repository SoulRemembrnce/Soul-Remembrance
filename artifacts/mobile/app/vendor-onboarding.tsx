import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { usePaymentSheet } from "@/hooks/usePaymentSheet";
import {
  FSVendorApplication,
  createVendorApplicationWithTier,
  subscribeVendorApplicationByUid,
  subscribeVendorProfile,
} from "@/lib/firestore";

const PRODUCT_CATEGORIES = [
  { id: "crystals", label: "Crystals & Gemstones", emoji: "💎" },
  { id: "bracelets", label: "Bracelets & Jewellery", emoji: "📿" },
  { id: "sound-healing", label: "Sound Healing", emoji: "🎵" },
  { id: "incense", label: "Incense & Aromatherapy", emoji: "🕯️" },
  { id: "books", label: "Books & Oracle Cards", emoji: "📚" },
  { id: "clothing", label: "Clothing & Accessories", emoji: "👕" },
  { id: "art", label: "Art & Home Decor", emoji: "🎨" },
  { id: "other", label: "Other Spiritual Goods", emoji: "✨" },
];

type Tier = "basic" | "verified";
type Step = "tier" | "form" | "submitted";

const TIER_CONFIG = {
  basic: {
    label: "Basic Listing",
    price: 1.99,
    pricePence: 199,
    emoji: "🏪",
    color: "#C9A84C",
    perks: ["List unlimited products", "Appear in Soul Shop", "In-app messaging with buyers", "3% commission on sales"],
  },
  verified: {
    label: "Verified Seller",
    price: 2.99,
    pricePence: 299,
    emoji: "✅",
    color: "#2D7D46",
    perks: ["Everything in Basic", "✓ Verified badge on all products", "Priority placement in search", "Boosted trust with buyers", "3% commission on sales"],
  },
};

export default function VendorOnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, isAnonymous } = useApp();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  const [existingApp, setExistingApp] = useState<FSVendorApplication | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("tier");

  // Tier selection
  const [selectedTier, setSelectedTier] = useState<Tier>("basic");
  const [wantFeatured, setWantFeatured] = useState(false);

  // Form fields
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState("");

  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const unsubApp = subscribeVendorApplicationByUid(userId, (app) => {
      setExistingApp(app);
      setLoading(false);
    });
    const unsubProfile = subscribeVendorProfile(userId, (profile) => {
      setIsApproved(!!profile?.approved);
    });
    return () => { unsubApp(); unsubProfile(); };
  }, [userId]);

  const toggleCategory = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  const totalPrice = useMemo(() => {
    return TIER_CONFIG[selectedTier].price + (wantFeatured ? 4.99 : 0);
  }, [selectedTier, wantFeatured]);

  const handlePayAndSubmit = useCallback(async () => {
    if (!userId) return;
    const trimName = businessName.trim();
    const trimDesc = description.trim();
    const trimEmail = contactEmail.trim();

    if (!trimName) { Alert.alert("Missing field", "Please enter your business name."); return; }
    if (!trimDesc) { Alert.alert("Missing field", "Please describe what your business sells."); return; }
    if (selectedCategories.length === 0) { Alert.alert("Missing field", "Please select at least one product category."); return; }
    if (!trimEmail) { Alert.alert("Missing field", "Please enter a contact email address."); return; }

    setPaying(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";

      // 1. Create PaymentIntent for vendor subscription fee
      const resp = await fetch(`${apiUrl}/api/shop/vendor-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedTier,
          featured: wantFeatured,
          userId,
          businessName: trimName,
        }),
      });

      if (!resp.ok) {
        const { error } = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error ?? "Failed to start payment");
      }

      const { clientSecret, paymentIntentId } = await resp.json();

      // 2. Init Stripe payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Soul Remembrance",
        appearance: {
          colors: {
            primary: "#2D1B69",
            background: "#FFFFFF",
            componentBackground: "#F7F0FF",
            componentBorder: "#D8C8F0",
            componentText: "#1A1A2E",
            primaryText: "#1A1A2E",
            secondaryText: "#6B5B8A",
            placeholderText: "#9B8BB4",
            icon: "#2D1B69",
          },
        },
      });
      if (initError) throw new Error(initError.message);

      // 3. Present payment sheet
      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if (payError.code === "Canceled") { setPaying(false); return; }
        throw new Error(payError.message);
      }

      // 4. Payment succeeded — submit application to Firestore
      await createVendorApplicationWithTier({
        userId,
        businessName: trimName,
        description: trimDesc,
        categories: selectedCategories,
        contactEmail: trimEmail,
        website: website.trim() || "",
        tier: selectedTier,
        featuredPaid: wantFeatured,
        paymentIntentId,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("submitted");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Something went wrong. Please try again.");
    } finally {
      setPaying(false);
    }
  }, [
    userId, businessName, description, selectedCategories, contactEmail, website,
    selectedTier, wantFeatured, initPaymentSheet, presentPaymentSheet,
  ]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 16,
      borderBottomWidth: 1, borderBottomColor: `${colors.warmGold}20`,
    },
    backBtn: { marginRight: 12 },
    headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.charcoal },
    content: { padding: 20 },
    statusCard: { borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1 },
    statusIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    statusTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
    statusBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
    approvedBtn: { marginTop: 16, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center" },
    approvedBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
    sectionTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.charcoal, marginBottom: 6 },
    sectionSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.sage, lineHeight: 20, marginBottom: 24 },
    tierCard: {
      borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 2,
    },
    tierHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    tierEmoji: { fontSize: 28 },
    tierLabel: { fontSize: 17, fontFamily: "Inter_700Bold" },
    tierPrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
    tierPriceSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    tierPerks: { gap: 6, marginTop: 10 },
    tierPerk: { flexDirection: "row", alignItems: "center", gap: 8 },
    tierPerkText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },
    selectedDot: {
      width: 24, height: 24, borderRadius: 12, borderWidth: 2,
      alignItems: "center", justifyContent: "center",
    },
    featuredBox: {
      borderRadius: 14, padding: 16, borderWidth: 1.5, marginBottom: 24,
    },
    featuredBoxHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
    featuredBoxTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
    featuredBoxPrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
    featuredBoxSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
    continueBtn: {
      borderRadius: 14, paddingVertical: 16, alignItems: "center",
      marginBottom: 40, flexDirection: "row", justifyContent: "center", gap: 8,
    },
    continueBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.charcoal, marginBottom: 8, letterSpacing: 0.3 },
    input: {
      borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 15, fontFamily: "Inter_400Regular", backgroundColor: colors.card,
    },
    textArea: { height: 100, textAlignVertical: "top" },
    section: { marginBottom: 20 },
    categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    categoryChip: {
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5,
      flexDirection: "row", alignItems: "center", gap: 6,
    },
    chipLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
    totalRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      backgroundColor: `${colors.warmGold}15`, borderRadius: 12, padding: 16, marginBottom: 12,
    },
    totalLabel: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.charcoal },
    totalAmt: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.warmGold },
    payBtn: {
      borderRadius: 14, paddingVertical: 16, alignItems: "center",
      marginBottom: 40, flexDirection: "row", justifyContent: "center", gap: 10,
    },
    payBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
    note: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.sage, textAlign: "center", marginBottom: 16, lineHeight: 17 },
  }), [colors, insets.top]);

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.warmGold} />
      </View>
    );
  }

  // ── Already approved ────────────────────────────────────────────────────────
  if (isApproved) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Feather name="x" size={22} color={colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendor Dashboard</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.statusCard, { backgroundColor: "#F0FFF4", borderColor: "#9AE6B4" }]}>
            <View style={[styles.statusIcon, { backgroundColor: "#C6F6D5" }]}>
              <Feather name="check-circle" size={24} color="#38a169" />
            </View>
            <Text style={[styles.statusTitle, { color: "#2F855A" }]}>You're an approved vendor!</Text>
            <Text style={[styles.statusBody, { color: "#276749" }]}>
              Your vendor account is active. Start listing products so they appear in the Soul Shop.
            </Text>
            <TouchableOpacity
              style={[styles.approvedBtn, { backgroundColor: "#38a169" }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.replace("/vendor-products" as any); }}
              activeOpacity={0.85}
            >
              <Text style={styles.approvedBtnText}>Manage My Products →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Application submitted (pending/rejected) ─────────────────────────────────
  if (existingApp && step !== "submitted") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Feather name="x" size={22} color={colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Application Status</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {existingApp.status === "pending" && (
            <View style={[styles.statusCard, { backgroundColor: `${colors.warmGold}10`, borderColor: `${colors.warmGold}40` }]}>
              <View style={[styles.statusIcon, { backgroundColor: `${colors.warmGold}20` }]}>
                <Feather name="clock" size={24} color={colors.warmGold} />
              </View>
              <Text style={[styles.statusTitle, { color: colors.charcoal }]}>Under review</Text>
              <Text style={[styles.statusBody, { color: colors.sage }]}>
                We've received your application for{" "}
                <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.charcoal }}>{existingApp.businessName}</Text>
                {existingApp.tier && (
                  <Text> as a {existingApp.tier === "verified" ? "Verified Seller" : "Basic"} vendor</Text>
                )}
                . We typically review within 2–3 working days.
              </Text>
            </View>
          )}
          {existingApp.status === "rejected" && (
            <View style={[styles.statusCard, { backgroundColor: "#FFF5F5", borderColor: "#FED7D7" }]}>
              <View style={[styles.statusIcon, { backgroundColor: "#FED7D7" }]}>
                <Feather name="alert-circle" size={24} color="#E53E3E" />
              </View>
              <Text style={[styles.statusTitle, { color: "#C53030" }]}>Application not approved</Text>
              <Text style={[styles.statusBody, { color: "#822727" }]}>
                {existingApp.rejectionNote || "Your application was not approved at this time. Please review your details and reapply."}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Post-submit success ───────────────────────────────────────────────────────
  if (step === "submitted") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Feather name="x" size={22} color={colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Application Submitted</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
          <Text style={{ fontSize: 64, marginBottom: 20 }}>🎉</Text>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.charcoal, textAlign: "center", marginBottom: 10 }}>
            Payment received!
          </Text>
          <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: colors.sage, textAlign: "center", lineHeight: 24, marginBottom: 32 }}>
            Your {selectedTier === "verified" ? "Verified Seller" : "Basic"} vendor application is under review.
            {wantFeatured ? " Your featured placement will be activated once approved." : ""}
            {"\n\n"}We'll approve within 2–3 working days and you'll be able to start listing immediately.
          </Text>
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: colors.warmGold, width: "100%" }]}
            onPress={() => router.replace("/(tabs)/shop" as any)}
            activeOpacity={0.88}
          >
            <Text style={styles.continueBtnText}>Back to Shop</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Step: Tier selection ──────────────────────────────────────────────────────
  if (step === "tier") {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Feather name="x" size={22} color={colors.charcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Become a Vendor</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Choose your plan</Text>
          <Text style={styles.sectionSub}>
            One-time listing fee · Only 3% commission on sales · Cancel anytime
          </Text>

          {(["basic", "verified"] as Tier[]).map((tier) => {
            const cfg = TIER_CONFIG[tier];
            const selected = selectedTier === tier;
            return (
              <TouchableOpacity
                key={tier}
                style={[
                  styles.tierCard,
                  {
                    backgroundColor: selected ? `${cfg.color}12` : colors.card,
                    borderColor: selected ? cfg.color : `${colors.warmGold}25`,
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); setSelectedTier(tier); }}
                activeOpacity={0.85}
              >
                <View style={styles.tierHeader}>
                  <Text style={styles.tierEmoji}>{cfg.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tierLabel, { color: colors.charcoal }]}>{cfg.label}</Text>
                  </View>
                  <View style={[styles.selectedDot, { borderColor: cfg.color, backgroundColor: selected ? cfg.color : "transparent" }]}>
                    {selected && <Feather name="check" size={13} color="#fff" />}
                  </View>
                </View>
                <Text style={[styles.tierPrice, { color: cfg.color }]}>£{cfg.price.toFixed(2)}</Text>
                <Text style={[styles.tierPriceSub, { color: colors.sage }]}>one-time listing fee</Text>
                <View style={styles.tierPerks}>
                  {cfg.perks.map((perk, i) => (
                    <View key={i} style={styles.tierPerk}>
                      <Feather name="check" size={14} color={cfg.color} />
                      <Text style={[styles.tierPerkText, { color: colors.charcoal }]}>{perk}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Featured add-on */}
          <TouchableOpacity
            style={[
              styles.featuredBox,
              {
                backgroundColor: wantFeatured ? "#FFF8E0" : colors.card,
                borderColor: wantFeatured ? colors.warmGold : `${colors.warmGold}30`,
              },
            ]}
            onPress={() => { Haptics.selectionAsync(); setWantFeatured((v) => !v); }}
            activeOpacity={0.85}
          >
            <View style={styles.featuredBoxHeader}>
              <Text style={{ fontSize: 22 }}>⭐</Text>
              <Text style={[styles.featuredBoxTitle, { color: colors.charcoal }]}>Featured Boost</Text>
              <Text style={[styles.featuredBoxPrice, { color: colors.warmGold }]}>+£4.99</Text>
              <View style={[styles.selectedDot, { borderColor: colors.warmGold, backgroundColor: wantFeatured ? colors.warmGold : "transparent" }]}>
                {wantFeatured && <Feather name="check" size={13} color="#fff" />}
              </View>
            </View>
            <Text style={[styles.featuredBoxSub, { color: colors.sage }]}>
              Your products appear in the Featured strip at the top of the shop — maximum visibility for new listings.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: colors.deepIndigo }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep("form"); }}
            activeOpacity={0.88}
          >
            <Text style={styles.continueBtnText}>
              Continue — {TIER_CONFIG[selectedTier].label}{wantFeatured ? " + Featured" : ""}
            </Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Step: Form ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep("tier")} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Business Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Selected plan summary */}
        <View style={[styles.statusCard, {
          backgroundColor: `${TIER_CONFIG[selectedTier].color}10`,
          borderColor: `${TIER_CONFIG[selectedTier].color}40`,
          marginBottom: 24,
        }]}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.charcoal }}>
            {TIER_CONFIG[selectedTier].emoji} {TIER_CONFIG[selectedTier].label}
            {wantFeatured ? " + ⭐ Featured" : ""}
            {"  "}
            <Text style={{ color: TIER_CONFIG[selectedTier].color }}>£{totalPrice.toFixed(2)}</Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>BUSINESS NAME *</Text>
          <TextInput
            style={[styles.input, { borderColor: `${colors.warmGold}30`, color: colors.charcoal }]}
            placeholder="e.g. Crystal Moon Studio"
            placeholderTextColor={colors.sage}
            value={businessName}
            onChangeText={setBusinessName}
            returnKeyType="next"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>WHAT DO YOU SELL? *</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: `${colors.warmGold}30`, color: colors.charcoal }]}
            placeholder="Describe your products and what makes them special…"
            placeholderTextColor={colors.sage}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>PRODUCT CATEGORIES *</Text>
          <View style={styles.categoryGrid}>
            {PRODUCT_CATEGORIES.map((cat) => {
              const selected = selectedCategories.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selected ? `${colors.deepIndigo}15` : colors.card,
                      borderColor: selected ? colors.deepIndigo : `${colors.warmGold}25`,
                    },
                  ]}
                  onPress={() => toggleCategory(cat.id)}
                  activeOpacity={0.75}
                >
                  <Text>{cat.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: selected ? colors.deepIndigo : colors.charcoal }]}>
                    {cat.label}
                  </Text>
                  {selected && <Feather name="check" size={13} color={colors.deepIndigo} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>CONTACT EMAIL *</Text>
          <TextInput
            style={[styles.input, { borderColor: `${colors.warmGold}30`, color: colors.charcoal }]}
            placeholder="hello@yourbusiness.com"
            placeholderTextColor={colors.sage}
            value={contactEmail}
            onChangeText={setContactEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            WEBSITE / SOCIAL{" "}
            <Text style={{ color: colors.sage, fontFamily: "Inter_400Regular" }}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.input, { borderColor: `${colors.warmGold}30`, color: colors.charcoal }]}
            placeholder="https://instagram.com/yourshop"
            placeholderTextColor={colors.sage}
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
            returnKeyType="done"
          />
        </View>

        {/* Total + pay button */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total to pay now</Text>
          <Text style={styles.totalAmt}>£{totalPrice.toFixed(2)}</Text>
        </View>

        <Text style={styles.note}>
          Payment processed securely by Stripe · Your listing fee is non-refundable after approval
        </Text>

        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: paying ? `${colors.warmGold}80` : colors.warmGold }]}
          onPress={handlePayAndSubmit}
          disabled={paying}
          activeOpacity={0.85}
        >
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="lock" size={16} color="#fff" />
              <Text style={styles.payBtnText}>Pay £{totalPrice.toFixed(2)} & Submit Application</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
