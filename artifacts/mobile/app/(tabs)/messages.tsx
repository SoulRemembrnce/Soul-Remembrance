import { AshTreeBackground } from "@/components/AshTreeBackground";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { FSConversation, subscribeConversations } from "@/lib/firestore";

function relativeTime(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();

  const [conversations, setConversations] = useState<FSConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const unsub = subscribeConversations(userId, (convs) => {
      setConversations(convs);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <AshTreeBackground />
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

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator color={colors.deepIndigo} size="large" />
        </View>
      ) : !userId ? (
        <View style={styles.emptyState}>
          <Feather name="message-circle" size={48} color={colors.blush} />
          <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>Sign in to message</Text>
          <Text style={[styles.emptyBody, { color: colors.sage }]}>
            Sign in from your Profile tab to view your conversations
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: conv }) => (
            <TouchableOpacity
              onPress={() => router.push(`/chat/${conv.id}`)}
              style={[styles.threadItem, { borderBottomColor: colors.cream }]}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={conv.otherAvatarColor as [string, string]}
                style={styles.threadAvatar}
              >
                <Text style={styles.threadInitials}>{conv.otherInitials}</Text>
              </LinearGradient>
              <View style={styles.threadContent}>
                <View style={styles.threadMeta}>
                  <Text style={[styles.threadFrom, { color: colors.charcoal }]}>
                    {conv.otherName}
                  </Text>
                  <Text style={[styles.threadTime, { color: colors.sage }]}>
                    {relativeTime(conv.lastMessageAt)}
                  </Text>
                </View>
                <View style={styles.threadPreviewRow}>
                  <Text
                    style={[
                      styles.threadPreview,
                      {
                        color: conv.unreadCount > 0 ? colors.charcoal : colors.sage,
                        fontFamily: conv.unreadCount > 0 ? "Inter_500Medium" : "Inter_400Regular",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {conv.lastMessage}
                  </Text>
                  {conv.unreadCount > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: colors.deepIndigo }]}>
                      <Text style={styles.unreadCount}>{conv.unreadCount}</Text>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerTitle: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  composeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  centred: { flex: 1, alignItems: "center", justifyContent: "center" },
  threadItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1,
  },
  threadAvatar: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  threadInitials: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  threadContent: { flex: 1, marginLeft: 14 },
  threadMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  threadFrom: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  threadTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  threadPreviewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  threadPreview: { fontSize: 13, flex: 1 },
  unreadBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8, minWidth: 20, alignItems: "center" },
  unreadCount: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
