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
const CONTROLLER = "Soul Remembrance";

interface Section {
  title: string;
  body: string | string[];
}

const SECTIONS: Section[] = [
  {
    title: "Who We Are",
    body: `${CONTROLLER} ("Soul Remembrance", "we", "us", "our") operates the Soul Remembrance mobile application. We are the data controller responsible for your personal data.\n\nIf you have any privacy questions or requests, contact us at ${CONTACT_EMAIL}.`,
  },
  {
    title: "Data We Collect",
    body: [
      "Account data — your name, email address, and profile photo when you sign in with Google or create an account.",
      "Practitioner profile data — your professional title, bio, location, modalities, hourly rate, qualifications, and subscription status.",
      "Booking & payment data — session dates, amounts, and Stripe payment tokens. We do not store full card numbers; Stripe handles card data directly.",
      "Messages — conversation content between you and practitioners or clients, stored in Firebase Firestore.",
      "Location — approximate city/region you provide manually; precise GPS location is used only locally to sort nearby practitioners and is never stored on our servers.",
      "Usage data — standard app diagnostics and crash reports via Firebase, which may include device type, OS version, and session length.",
      "Vendor data — if you apply to become a vendor: your business name, website, product category, chosen subscription tier, and application status.",
      "Shop product data — product names, descriptions, prices, images, and stock information you provide as a vendor.",
    ],
  },
  {
    title: "How We Use Your Data",
    body: [
      "To provide and personalise the Soul Remembrance service.",
      "To process bookings and payments through Stripe.",
      "To connect clients with practitioners.",
      "To send service-related notifications (booking confirmations, reminders).",
      "To improve app performance and fix bugs via Firebase Analytics and Crashlytics.",
      "To comply with legal and regulatory obligations.",
    ],
  },
  {
    title: "Legal Basis (GDPR)",
    body: `We process your data under the following legal bases:\n\n• Contract — processing needed to fulfil your bookings or subscription.\n• Legitimate interest — security, fraud prevention, and improving our service.\n• Consent — optional features such as location sorting and marketing communications. You can withdraw consent at any time in Settings.\n• Legal obligation — retaining financial records as required by law.`,
  },
  {
    title: "Third-Party Processors",
    body: `We share data only with trusted processors:\n\n• Google / Firebase — authentication, database (Firestore), file storage, and analytics. Data is processed under Google's Data Processing Agreement.\n• Stripe — payment processing, practitioner payouts (Stripe Connect), and vendor subscription billing. Stripe is PCI-DSS Level 1 certified.\n\nWe do not sell your data to any third party for advertising purposes.`,
  },
  {
    title: "Data Retention",
    body: `We retain your account and profile data for as long as your account is active. If you delete your account:\n\n• Your profile is removed from the app within 30 days.\n• Financial records are retained for 7 years to meet legal obligations.\n• Backups may retain data for up to 90 days before being purged.`,
  },
  {
    title: "Your Rights (GDPR)",
    body: [
      "Right to access — request a copy of the personal data we hold about you.",
      "Right to rectification — ask us to correct inaccurate or incomplete data.",
      "Right to erasure — request deletion of your data ('right to be forgotten'), subject to legal retention obligations.",
      "Right to restriction — ask us to limit how we process your data in certain circumstances.",
      "Right to data portability — receive your data in a structured, machine-readable format.",
      "Right to object — object to processing based on legitimate interest or for direct marketing.",
      "Right to withdraw consent — where we rely on consent, you can withdraw it at any time.",
    ],
  },
  {
    title: "How to Exercise Your Rights",
    body: `Email us at ${CONTACT_EMAIL} with your request and we will respond within 30 days. You also have the right to lodge a complaint with your national supervisory authority (in the UK: the Information Commissioner's Office at ico.org.uk).`,
  },
  {
    title: "Security",
    body: `We use industry-standard security measures including:\n\n• Firebase Security Rules to control Firestore and Storage access.\n• HTTPS/TLS for all data in transit.\n• Stripe's PCI-compliant infrastructure for payment data.\n\nNo method of transmission or storage is 100% secure; we cannot guarantee absolute security but are committed to protecting your data.`,
  },
  {
    title: "Children",
    body: `Soul Remembrance is not intended for users under the age of 18. We do not knowingly collect personal data from children. If you believe a child has provided us data, please contact us and we will delete it promptly.`,
  },
  {
    title: "Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes via the app or by email. Continued use of the app after changes are posted constitutes acceptance of the updated policy.`,
  },
];

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      {/* Header */}
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
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <Text style={styles.headerSub}>Last updated {LAST_UPDATED}</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={[styles.introBanner, { backgroundColor: colors.card, borderColor: colors.cream }]}>
          <Feather name="shield" size={22} color={colors.deepIndigo} style={{ marginBottom: 10 }} />
          <Text style={[styles.introText, { color: colors.charcoal }]}>
            Your privacy matters to us. This policy explains what personal data Soul Remembrance collects, why we collect it, and the rights you have under the GDPR and UK GDPR.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map((sec, i) => (
          <View key={i} style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cream }]}>
            <Text style={[styles.sectionTitle, { color: colors.deepIndigo }]}>{sec.title}</Text>
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

        {/* Contact footer */}
        <View style={[styles.contactCard, { backgroundColor: colors.deepIndigo }]}>
          <Feather name="mail" size={18} color="rgba(255,255,255,0.8)" style={{ marginBottom: 8 }} />
          <Text style={styles.contactTitle}>Questions or requests?</Text>
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
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
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
