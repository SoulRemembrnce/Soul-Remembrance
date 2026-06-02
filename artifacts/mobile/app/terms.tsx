import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const LAST_UPDATED = "June 2026";
const CONTACT_EMAIL = "soulremembrance@outlook.com";

interface Section {
  title: string;
  body: string | string[];
}

const SECTIONS: Section[] = [
  {
    title: "Acceptance of Terms",
    body: `By downloading, installing, or using the Soul Remembrance app ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, please do not use the App.\n\nThese Terms form a legally binding agreement between you and Soul Remembrance ("we", "us", "our"). We may update these Terms from time to time — continued use of the App after changes are posted constitutes acceptance.`,
  },
  {
    title: "Eligibility",
    body: [
      "You must be at least 18 years old to use Soul Remembrance.",
      "By using the App you confirm you have the legal capacity to enter into these Terms.",
      "Practitioners must hold any licences or qualifications required by their professional body to offer the services they list.",
    ],
  },
  {
    title: "Account Responsibilities",
    body: [
      "You are responsible for keeping your login credentials secure. Do not share your account.",
      "You must provide accurate and complete information when creating your account or practitioner profile.",
      "You are responsible for all activity that occurs under your account.",
      "You must notify us immediately at soulremembrance@outlook.com if you suspect unauthorised access to your account.",
    ],
  },
  {
    title: "Practitioner Listings",
    body: `Practitioners who list services on Soul Remembrance:\n\n• Are independent third parties and are not employees or agents of Soul Remembrance.\n• Are solely responsible for the services they provide, including their quality, safety, and legality.\n• Must hold appropriate professional indemnity insurance and any required DBS checks.\n• Must only offer services within their scope of competence and relevant qualifications.\n\nSoul Remembrance does not endorse, warrant, or guarantee the services of any practitioner listed on the App.`,
  },
  {
    title: "Bookings & Payments",
    body: [
      "Bookings are agreements between you (the client) and the practitioner — Soul Remembrance facilitates but is not a party to the service.",
      "Payments are processed securely by Stripe. We do not store your card details.",
      "Practitioners receive 97.5% of each booking; Soul Remembrance retains a 2.5% platform fee.",
      "Cancellation and refund policies are set by each practitioner. Check their profile before booking.",
      "Soul Remembrance is not liable for disputes between clients and practitioners arising from a session.",
    ],
  },
  {
    title: "Practitioner Subscriptions",
    body: `Practitioners pay a £3.99/month subscription to maintain an active listing on Soul Remembrance.\n\n• A 30-day free trial is available to new subscribers.\n• Subscriptions renew automatically each month until cancelled.\n• You may cancel at any time via your practitioner dashboard; access continues until the end of the billing period.\n• No refunds are issued for partial billing periods.`,
  },
  {
    title: "Prohibited Conduct",
    body: [
      "Use the App for any unlawful purpose or in violation of any regulations.",
      "Post false, misleading, or fraudulent information in your profile or listings.",
      "Harass, abuse, or threaten other users or practitioners.",
      "Attempt to reverse engineer, scrape, or interfere with the App or its infrastructure.",
      "Use the App to offer or solicit services that are illegal, harmful, or outside your professional scope.",
      "Circumvent the platform to take payments outside the App in order to avoid platform fees.",
    ],
  },
  {
    title: "Intellectual Property",
    body: `All content within the App — including the Soul Remembrance name, logo, design, and original text — is owned by or licensed to Soul Remembrance and protected by applicable intellectual property laws.\n\nYou retain ownership of content you upload (profile photos, practitioner bios, etc.) but grant Soul Remembrance a non-exclusive, royalty-free licence to display that content within the App for the purpose of providing the service.`,
  },
  {
    title: "Disclaimers",
    body: `Soul Remembrance is a platform connecting clients with independent wellness practitioners. We are not a healthcare provider and the App does not constitute medical advice.\n\n• Nothing in the App should be relied upon as professional medical, psychological, or therapeutic advice.\n• Soul Remembrance makes no warranty that the App will be uninterrupted, error-free, or free of viruses.\n• The App is provided "as is" and "as available" without warranties of any kind.`,
  },
  {
    title: "Limitation of Liability",
    body: `To the maximum extent permitted by law, Soul Remembrance shall not be liable for:\n\n• Any indirect, incidental, special, or consequential damages.\n• Loss of data, profits, goodwill, or business opportunities.\n• Any harm arising from sessions booked through the App.\n\nOur total liability to you in any circumstances shall not exceed the total fees paid by you to Soul Remembrance in the 12 months preceding the claim.`,
  },
  {
    title: "Governing Law",
    body: `These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.\n\nIf you are a consumer in another jurisdiction, you may also have rights under local consumer protection laws that cannot be excluded by these Terms.`,
  },
  {
    title: "Contact",
    body: `For questions about these Terms, contact us at:\n\n${CONTACT_EMAIL}\n\nWe aim to respond to all enquiries within 5 working days.`,
  },
];

export default function TermsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <Text style={styles.headerSub}>Last updated {LAST_UPDATED}</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.introBanner, { backgroundColor: colors.card, borderColor: colors.cream }]}>
          <Feather name="file-text" size={22} color={colors.deepIndigo} style={{ marginBottom: 10 }} />
          <Text style={[styles.introText, { color: colors.charcoal }]}>
            Please read these Terms carefully before using Soul Remembrance. They explain your rights and responsibilities as a user or practitioner on our platform.
          </Text>
        </View>

        {SECTIONS.map((sec, i) => (
          <View key={i} style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cream }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionNum, { backgroundColor: `${colors.deepIndigo}15` }]}>
                <Text style={[styles.sectionNumText, { color: colors.deepIndigo }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.deepIndigo }]}>{sec.title}</Text>
            </View>
            {Array.isArray(sec.body) ? (
              sec.body.map((line, j) => (
                <View key={j} style={styles.bulletRow}>
                  <View style={[styles.bullet, { backgroundColor: colors.purpleMid }]} />
                  <Text style={[styles.bulletText, { color: colors.charcoal }]}>{line}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.bodyText, { color: colors.charcoal }]}>{sec.body}</Text>
            )}
          </View>
        ))}

        <View style={[styles.contactCard, { backgroundColor: colors.deepIndigo }]}>
          <Feather name="mail" size={18} color="rgba(255,255,255,0.8)" style={{ marginBottom: 8 }} />
          <Text style={styles.contactTitle}>Questions about these Terms?</Text>
          <Text style={styles.contactEmail}>{CONTACT_EMAIL}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  introBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: "center",
    marginBottom: 4,
  },
  introText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    textAlign: "center",
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  bodyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  contactCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginTop: 4,
  },
  contactTitle: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  contactEmail: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
