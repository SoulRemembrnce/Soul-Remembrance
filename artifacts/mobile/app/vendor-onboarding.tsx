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
import {
  FSVendorApplication,
  createVendorApplication,
  subscribeVendorApplicationByUid,
  subscribeVendorProfile,
} from "@/lib/firestore";

const CATEGORIES = [
  { id: "crystals", label: "Crystals & Gemstones", emoji: "💎" },
  { id: "bracelets", label: "Bracelets & Jewellery", emoji: "📿" },
  { id: "sound-healing", label: "Sound Healing", emoji: "🎵" },
  { id: "incense", label: "Incense & Aromatherapy", emoji: "🕯️" },
  { id: "books", label: "Books & Oracle Cards", emoji: "📚" },
  { id: "clothing", label: "Clothing & Accessories", emoji: "👕" },
  { id: "art", label: "Art & Home Decor", emoji: "🎨" },
  { id: "other", label: "Other Spiritual Goods", emoji: "✨" },
];

export default function VendorOnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, isAnonymous } = useApp();

  const [existingApp, setExistingApp] = useState<FSVendorApplication | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState("");

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

  const handleSubmit = useCallback(async () => {
    if (!userId) return;
    const trimName = businessName.trim();
    const trimDesc = description.trim();
    const trimEmail = contactEmail.trim();

    if (!trimName) { Alert.alert("Missing field", "Please enter your business name."); return; }
    if (!trimDesc) { Alert.alert("Missing field", "Please describe what your business sells."); return; }
    if (selectedCategories.length === 0) { Alert.alert("Missing field", "Please select at least one product category."); return; }
    if (!trimEmail) { Alert.alert("Missing field", "Please enter a contact email address."); return; }

    setSubmitting(true);
    try {
      await createVendorApplication({
        userId,
        businessName: trimName,
        description: trimDesc,
        categories: selectedCategories,
        contactEmail: trimEmail,
        website: website.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not submit your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [userId, businessName, description, selectedCategories, contactEmail, website]);

  const statusColor = useMemo(() => {
    if (existingApp?.status === "approved") return "#38a169";
    if (existingApp?.status === "rejected") return "#E53E3E";
    return colors.warmGold;
  }, [existingApp?.status, colors.warmGold]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: insets.top + 12,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.warmGold}20`,
    },
    backBtn: { marginRight: 12 },
    headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.charcoal },
    content: { padding: 20 },
    statusCard: {
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
    },
    statusIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    statusTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
    statusBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
    approvedBtn: {
      marginTop: 16,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: "center",
    },
    approvedBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
    heroGradient: { borderRadius: 20, padding: 24, marginBottom: 28, alignItems: "center" },
    heroIcon: { fontSize: 42, marginBottom: 12 },
    heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", marginBottom: 6 },
    heroBody: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 20 },
    section: { marginBottom: 20 },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.charcoal, marginBottom: 8, letterSpacing: 0.3 },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      backgroundColor: colors.card,
    },
    textArea: { height: 100, textAlignVertical: "top" },
    categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    categoryChip: {
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1.5,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    chipLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
    submitBtn: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
      marginBottom: 40,
    },
    submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
    note: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.sage, textAlign: "center", marginBottom: 16, lineHeight: 17 },
  }), [colors, insets.top]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="x" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Vendor</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.warmGold} />
        </View>
      ) : isApproved ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.statusCard, { backgroundColor: "#F0FFF4", borderColor: "#9AE6B4" }]}>
            <View style={[styles.statusIcon, { backgroundColor: "#C6F6D5" }]}>
              <Feather name="check-circle" size={24} color="#38a169" />
            </View>
            <Text style={[styles.statusTitle, { color: "#2F855A" }]}>You're an approved vendor!</Text>
            <Text style={[styles.statusBody, { color: "#276749" }]}>
              Your vendor account is active. Start listing your products so they appear in the Soul Shop.
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
      ) : existingApp ? (
        <ScrollView contentContainerStyle={styles.content}>
          {existingApp.status === "pending" && (
            <View style={[styles.statusCard, { backgroundColor: `${colors.warmGold}10`, borderColor: `${colors.warmGold}40` }]}>
              <View style={[styles.statusIcon, { backgroundColor: `${colors.warmGold}20` }]}>
                <Feather name="clock" size={24} color={colors.warmGold} />
              </View>
              <Text style={[styles.statusTitle, { color: colors.charcoal }]}>Application under review</Text>
              <Text style={[styles.statusBody, { color: colors.sage }]}>
                We've received your application for <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.charcoal }}>{existingApp.businessName}</Text>. We typically review vendor applications within 2–3 working days.
              </Text>
            </View>
          )}
          {existingApp.status === "rejected" && (
            <View style={[styles.statusCard, { backgroundColor: "#FFF5F5", borderColor: "#FED7D7" }]}>
              <View style={[styles.statusIcon, { backgroundColor: "#FED7D7" }]}>
                <Feather name="alert-circle" size={24} color="#E53E3E" />
              </View>
              <Text style={[styles.statusTitle, { color: "#C53030" }]}>Application not approved</Text>
              {existingApp.rejectionNote ? (
                <Text style={[styles.statusBody, { color: "#822727" }]}>{existingApp.rejectionNote}</Text>
              ) : (
                <Text style={[styles.statusBody, { color: "#822727" }]}>
                  Your application was not approved at this time. Please review your details and reapply below.
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={[colors.deepIndigo, "#7B5EA7"]} style={styles.heroGradient}>
            <Text style={styles.heroIcon}>🏪</Text>
            <Text style={styles.heroTitle}>Open Your Soul Shop</Text>
            <Text style={styles.heroBody}>
              Sell your spiritual products directly to our community of seekers. Apply below and we'll review your application within 2–3 working days.
            </Text>
          </LinearGradient>

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
              {CATEGORIES.map((cat) => {
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
            <Text style={styles.label}>WEBSITE / SOCIAL <Text style={{ color: colors.sage, fontFamily: "Inter_400Regular" }}>(optional)</Text></Text>
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

          <Text style={styles.note}>
            By applying you agree that Soul Remembrance will list your products in the Soul Shop. We review all applications before approval.
          </Text>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: submitting ? `${colors.warmGold}60` : colors.warmGold }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Application</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
