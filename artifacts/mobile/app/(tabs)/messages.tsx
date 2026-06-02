import { AshTreeBackground } from "@/components/AshTreeBackground";
import { LotusIcon } from "@/components/LotusIcon";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  FSConversation,
  FSGroupChat,
  subscribeConversations,
  subscribeGroupChats,
} from "@/lib/firestore";

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
  const [groupChats, setGroupChats] = useState<FSGroupChat[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const totalUnread =
    conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0) +
    groupChats.reduce((sum, c) => sum + (c.unreadCounts?.[userId ?? ""] ?? 0), 0);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let dmDone = false;
    let gcDone = false;
    const checkDone = () => { if (dmDone && gcDone) setLoading(false); };

    const unsubDM = subscribeConversations(userId, (convs) => {
      setConversations(convs);
      dmDone = true;
      checkDone();
    });
    const unsubGC = subscribeGroupChats(userId, (chats) => {
      setGroupChats(chats);
      gcDone = true;
      checkDone();
    });
    return () => { unsubDM(); unsubGC(); };
  }, [userId]);

  const hasAny = groupChats.length > 0 || conversations.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <AshTreeBackground />
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <LotusIcon size={22} />
              <Text style={styles.headerTitle}>Messages</Text>
            </View>
            {totalUnread > 0 && (
              <Text style={styles.headerSub}>{totalUnread} unread</Text>
            )}
          </View>
          <TouchableOpacity style={styles.composeBtn} onPress={() => router.push("/new-message" as any)}>
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
      ) : !hasAny ? (
        <View style={styles.emptyState}>
          <Feather name="message-circle" size={48} color={colors.blush} />
          <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>No messages yet</Text>
          <Text style={[styles.emptyBody, { color: colors.sage }]}>
            Book a session to start chatting with a practitioner
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {groupChats.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { borderBottomColor: colors.cream }]}>
                <Feather name="users" size={13} color={colors.warmGold} />
                <Text style={[styles.sectionTitle, { color: colors.warmGold }]}>Retreat Chats</Text>
              </View>
              {groupChats.map((chat) => {
                const myUnread = chat.unreadCounts?.[userId ?? ""] ?? 0;
                return (
                  <TouchableOpacity
                    key={chat.id}
                    onPress={() => router.push(`/group-chat/${chat.id}` as any)}
                    style={[styles.threadItem, { borderBottomColor: colors.cream }]}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={chat.avatarColor}
                      style={styles.groupAvatar}
                    >
                      <Feather name="users" size={18} color="#fff" />
                    </LinearGradient>
                    <View style={styles.threadContent}>
                      <View style={styles.threadMeta}>
                        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[styles.threadFrom, { color: colors.charcoal }]} numberOfLines={1}>
                            {chat.retreatTitle}
                          </Text>
                          <View style={[styles.retreatBadge, { backgroundColor: `${colors.warmGold}20` }]}>
                            <Text style={[styles.retreatBadgeText, { color: colors.warmGold }]}>
                              {chat.memberUids.length} members
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.threadTime, { color: colors.sage }]}>
                          {relativeTime(chat.lastMessageAt)}
                        </Text>
                      </View>
                      <View style={styles.threadPreviewRow}>
                        <Text
                          style={[
                            styles.threadPreview,
                            {
                              color: myUnread > 0 ? colors.charcoal : colors.sage,
                              fontFamily: myUnread > 0 ? "Inter_500Medium" : "Inter_400Regular",
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {chat.lastMessage}
                        </Text>
                        {myUnread > 0 && (
                          <View style={[styles.unreadBadge, { backgroundColor: colors.warmGold }]}>
                            <Text style={styles.unreadCount}>{myUnread}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {conversations.length > 0 && (
            <>
              {groupChats.length > 0 && (
                <View style={[styles.sectionHeader, { borderBottomColor: colors.cream }]}>
                  <Feather name="message-circle" size={13} color={colors.purpleMid} />
                  <Text style={[styles.sectionTitle, { color: colors.purpleMid }]}>Direct Messages</Text>
                </View>
              )}
              {conversations.map((conv) => (
                <TouchableOpacity
                  key={conv.id}
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
              ))}
            </>
          )}
        </ScrollView>
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  threadItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1,
  },
  threadAvatar: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  groupAvatar: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  threadInitials: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  threadContent: { flex: 1, marginLeft: 14 },
  threadMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  threadFrom: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  threadTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: 6, flexShrink: 0 },
  threadPreviewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  threadPreview: { fontSize: 13, flex: 1 },
  unreadBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8, minWidth: 20, alignItems: "center" },
  unreadCount: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  retreatBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  retreatBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
