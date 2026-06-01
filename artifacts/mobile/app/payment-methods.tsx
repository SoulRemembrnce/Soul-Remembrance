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

export default function PaymentMethodsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stripe badge */}
        <View style={[styles.stripeCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
          <View style={[styles.stripeIconWrap, { backgroundColor: `${colors.deepIndigo}12` }]}>
            <Feather name="shield" size={24} color={colors.deepIndigo} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stripeTitle, { color: colors.charcoal }]}>
              Secured by Stripe
            </Text>
            <Text style={[styles.stripeSub, { color: colors.sage }]}>
              Your card details are encrypted and stored securely by Stripe. Soul Remembrance never sees your full card number.
            </Text>
          </View>
        </View>

        {/* How payments work */}
        <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>HOW PAYMENTS WORK</Text>

        {[
          {
            icon: "credit-card",
            title: "Booking a session",
            body: "When you book a session, you'll be asked to enter your card details securely at checkout. Each booking is a one-time charge.",
          },
          {
            icon: "repeat",
            title: "Practitioner subscription",
            body: "Practitioner plans are billed monthly via Stripe Checkout. You can cancel anytime through Stripe's customer portal.",
          },
          {
            icon: "star",
            title: "Featured placement",
            body: "Featured Practitioner boosts are one-time £4.99 charges. Payment is taken securely at the time of purchase.",
          },
          {
            icon: "lock",
            title: "Refunds",
            body: "For refunds or payment queries, please contact support from the Help & Support menu.",
          },
        ].map((item, i) => (
          <View
            key={i}
            style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.cream }]}
          >
            <View style={[styles.infoIcon, { backgroundColor: `${colors.deepIndigo}12` }]}>
              <Feather name={item.icon as any} size={16} color={colors.deepIndigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: colors.charcoal }]}>{item.title}</Text>
              <Text style={[styles.infoBody, { color: colors.sage }]}>{item.body}</Text>
            </View>
          </View>
        ))}
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
  stripeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  stripeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stripeTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  stripeSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  infoBody: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
