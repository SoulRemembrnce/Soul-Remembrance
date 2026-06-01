import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { THREADS } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const totalUnread = THREADS.reduce((sum, t) => sum + t.unread, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Messages</Text>
            {totalUnread > 0 && (
              <Text style={styles.headerSub}>{totalUnread} unread</Text>
            )}
          </View>
          <TouchableOpacity style={styles.composeBtn}>
            <Feather name="edit" size={18} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={THREADS}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: thread }) => (
          <TouchableOpacity
            onPress={() => router.push(`/chat/${thread.id}`)}
            style={[styles.threadItem, { borderBottomColor: colors.cream }]}
            activeOpacity={0.7}
          >
            <LinearGradient colors={thread.avatarColor as [string, string]} style={styles.threadAvatar}>
              <Text style={styles.threadInitials}>{thread.initials}</Text>
            </LinearGradient>
            <View style={styles.threadContent}>
              <View style={styles.threadMeta}>
                <Text style={[styles.threadFrom, { color: colors.charcoal }]}>{thread.from}</Text>
                <Text style={[styles.threadTime, { color: colors.sage }]}>{thread.time}</Text>
              </View>
              <View style={styles.threadPreviewRow}>
                <Text
                  style={[
                    styles.threadPreview,
                    {
                      color: thread.unread > 0 ? colors.charcoal : colors.sage,
                      fontFamily: thread.unread > 0 ? "Inter_500Medium" : "Inter_400Regular",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {thread.preview}
                </Text>
                {thread.unread > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.deepIndigo }]}>
                    <Text style={styles.unreadCount}>{thread.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={48} color={colors.blush} />
            <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>No messages yet</Text>
            <Text style={[styles.emptyBody, { color: colors.sage }]}>
              Book a session to start chatting with a practitioner
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  composeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  threadItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  threadAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  threadInitials: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  threadContent: {
    flex: 1,
    marginLeft: 14,
  },
  threadMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  threadFrom: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  threadTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  threadPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  threadPreview: {
    fontSize: 13,
    flex: 1,
  },
  unreadBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: "center",
  },
  unreadCount: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
