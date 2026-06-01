import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const FAQS = [
  {
    q: "How do I book a session?",
    a: "Browse practitioners on the Explore tab, open their profile, and tap 'Book a Session'. Choose a time slot and complete payment securely via Stripe.",
  },
  {
    q: "How do cancellations work?",
    a: "Please contact the practitioner directly to cancel or reschedule. For billing queries, reach out to us at support@soulremembrance.com.",
  },
  {
    q: "How do I become a practitioner?",
    a: "Tap the Profile tab and scroll down to 'Become a Practitioner'. Complete the 5-step onboarding and start your 30-day free trial.",
  },
  {
    q: "What is Featured Practitioner?",
    a: "For £4.99 you can boost your listing to the Featured section on the home screen for 30 days, increasing your visibility to new clients.",
  },
  {
    q: "How does Stripe Connect work?",
    a: "Practitioners receive 97.5% of each session fee automatically. Set up payouts from your Practitioner Dashboard by connecting your Stripe account.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. Card details are handled entirely by Stripe and never stored on our servers. See our Privacy Policy for full details.",
  },
];

export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Contact card */}
        <View style={[styles.contactCard, { backgroundColor: colors.deepIndigo }]}>
          <Feather name="mail" size={22} color={colors.warmGold} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.contactTitle}>Contact Support</Text>
            <Text style={styles.contactSub}>We typically reply within 24 hours</Text>
          </View>
          <TouchableOpacity
            style={[styles.contactBtn, { backgroundColor: colors.warmGold }]}
            onPress={() => {
              if (Platform.OS !== "web") {
                Linking.openURL("mailto:support@soulremembrance.com");
              }
            }}
          >
            <Text style={styles.contactBtnText}>Email us</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>FREQUENTLY ASKED QUESTIONS</Text>
        <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
          {FAQS.map((item, i) => (
            <View
              key={i}
              style={[
                styles.faqItem,
                i < FAQS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.blush },
              ]}
            >
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => setOpenIndex(openIndex === i ? null : i)}
                activeOpacity={0.7}
              >
                <Text style={[styles.faqQ, { color: colors.charcoal, flex: 1 }]}>{item.q}</Text>
                <Feather
                  name={openIndex === i ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.sage}
                />
              </TouchableOpacity>
              {openIndex === i && (
                <Text style={[styles.faqA, { color: colors.sage }]}>{item.a}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Privacy link */}
        <TouchableOpacity
          style={[styles.privacyRow, { backgroundColor: colors.card, borderColor: colors.cream }]}
          onPress={() => router.push("/privacy")}
          activeOpacity={0.85}
        >
          <Feather name="shield" size={16} color={colors.deepIndigo} />
          <Text style={[styles.privacyLabel, { color: colors.charcoal }]}>Privacy Policy</Text>
          <Feather name="chevron-right" size={16} color={colors.sage} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  contactTitle: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  contactSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  contactBtn: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  contactBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 12,
  },
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  faqItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  faqQ: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  faqA: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginTop: 10,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  privacyLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
