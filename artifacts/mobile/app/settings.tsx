import { AshTreeBackground } from "@/components/AshTreeBackground";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [bookingReminders, setBookingReminders] = useState(true);
  const [communityUpdates, setCommunityUpdates] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const toggleStyle = { trackColor: { false: colors.blush, true: colors.deepIndigo }, thumbColor: "#fff" };

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <AshTreeBackground />
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        <Text style={[styles.sectionLabel, { color: colors.warmGold }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cream }]}>
          {[
            { label: "Email notifications", sub: "Receive confirmations and updates by email", value: emailNotifs, onChange: setEmailNotifs },
            { label: "Booking reminders", sub: "Reminders before your upcoming sessions", value: bookingReminders, onChange: setBookingReminders },
            { label: "Community activity", sub: "Likes and replies to your posts", value: communityUpdates, onChange: setCommunityUpdates },
            { label: "News & offers", sub: "Occasional updates from Soul Remembrance", value: marketingEmails, onChange: setMarketingEmails },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              style={[
                styles.row,
                i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.blush },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.charcoal }]}>{item.label}</Text>
                <Text style={[styles.rowSub, { color: colors.sage }]}>{item.sub}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onChange}
                {...toggleStyle}
              />
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.warmGold, marginTop: 24 }]}>ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cream }]}>
          {[
            { icon: "globe", label: "Language", value: "English" },
            { icon: "map-pin", label: "Region", value: "United Kingdom" },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              style={[
                styles.row,
                i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.blush },
              ]}
            >
              <Feather name={item.icon as any} size={16} color={colors.deepIndigo} style={{ marginRight: 10 }} />
              <Text style={[styles.rowTitle, { color: colors.charcoal, flex: 1 }]}>{item.label}</Text>
              <Text style={[styles.rowValue, { color: colors.sage }]}>{item.value}</Text>
              <Feather name="chevron-right" size={14} color={colors.blush} style={{ marginLeft: 6 }} />
            </View>
          ))}
        </View>

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
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  rowSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
