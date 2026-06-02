import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  FSGroupChat,
  FSGroupMessage,
  markGroupChatRead,
  sendGroupMessage,
  subscribeGroupChats,
  subscribeGroupMessages,
} from "@/lib/firestore";
import { getPushTokenForUserId } from "@/lib/firestore";
import { sendExpoPush } from "@/utils/notifications";

function relativeTime(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, userName } = useApp();

  const [chat, setChat] = useState<FSGroupChat | null>(null);
  const [messages, setMessages] = useState<FSGroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const userInitials = userName
    ? userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  useEffect(() => {
    if (!userId || !id) return;
    const unsub = subscribeGroupChats(userId, (chats) => {
      const found = chats.find((c) => c.id === id);
      if (found) setChat(found);
    });
    return unsub;
  }, [userId, id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeGroupMessages(id, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (id && userId) markGroupChatRead(id, userId).catch(() => {});
  }, [id, userId]);

  const handleSend = async () => {
    if (!input.trim() || !userId || !id) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await sendGroupMessage(id, userId, userName ?? "Member", userInitials, text, chat?.memberUids ?? []);
      // Push-notify all other group members (fire-and-forget)
      if (chat) {
        const otherUids = chat.memberUids.filter((uid) => uid !== userId);
        otherUids.forEach(async (uid) => {
          try {
            const token = await getPushTokenForUserId(uid);
            if (token) {
              const preview = text.length > 100 ? text.slice(0, 100) + "…" : text;
              await sendExpoPush(
                token,
                `${userName ?? "Someone"} · ${chat.retreatTitle}`,
                preview,
                { router: `/group-chat/${id}` }
              );
            }
          } catch { /* ignore */ }
        });
      }
    } finally {
      setSending(false);
    }
  };

  const memberCount = chat ? chat.memberUids.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        <LinearGradient
          colors={chat?.avatarColor ?? [colors.purpleMid, colors.deepIndigo]}
          style={styles.headerAvatar}
        >
          <Feather name="users" size={16} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>
            {chat?.retreatTitle ?? "Retreat Chat"}
          </Text>
          <Text style={styles.headerStatus}>
            {memberCount > 0 ? `${memberCount} member${memberCount !== 1 ? "s" : ""}` : "Group chat"}
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        {loading ? (
          <View style={styles.centred}>
            <ActivityIndicator color={colors.deepIndigo} size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <View style={[styles.emptyChatBubble, { backgroundColor: colors.cream }]}>
                  <Feather name="users" size={24} color={colors.purpleMid} style={{ marginBottom: 8, alignSelf: "center" }} />
                  <Text style={[styles.emptyChatText, { color: colors.sage }]}>
                    Welcome to the {chat?.retreatTitle ?? "retreat"} group chat!
                  </Text>
                  <Text style={[styles.emptyChatSub, { color: colors.blush }]}>
                    Only people who have booked this retreat can see this chat.
                  </Text>
                </View>
              </View>
            }
            renderItem={({ item, index }) => {
              const isMe = item.senderId === userId;
              const prevItem = index > 0 ? messages[index - 1] : null;
              const showName = !isMe && item.senderId !== prevItem?.senderId;
              return (
                <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
                  {!isMe && (
                    <View style={[styles.msgAvatar, { backgroundColor: colors.blush }]}>
                      <Text style={[styles.msgInitials, { color: colors.deepIndigo }]}>
                        {(chat?.memberInitials?.[item.senderId] ?? item.senderInitials ?? "?").slice(0, 2)}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1, alignItems: isMe ? "flex-end" : "flex-start" }}>
                    {showName && (
                      <Text style={[styles.senderName, { color: colors.purpleMid }]}>
                        {item.senderName}
                      </Text>
                    )}
                    <View
                      style={[
                        styles.bubble,
                        isMe
                          ? [styles.bubbleMe, { backgroundColor: colors.deepIndigo }]
                          : [styles.bubbleThem, { backgroundColor: colors.card, borderColor: colors.cream }],
                      ]}
                    >
                      <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.charcoal }]}>
                        {item.text}
                      </Text>
                      <Text
                        style={[
                          styles.bubbleTime,
                          { color: isMe ? "rgba(255,255,255,0.55)" : colors.sage },
                        ]}
                      >
                        {relativeTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                  {isMe && <View style={styles.msgAvatarPlaceholder} />}
                </View>
              );
            }}
          />
        )}

        <View
          style={[
            styles.inputBar,
            { paddingBottom: bottomPad + 8, backgroundColor: colors.card, borderTopColor: colors.cream },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message the group..."
            placeholderTextColor={colors.sage}
            style={[
              styles.inputField,
              { backgroundColor: colors.softWhite, color: colors.charcoal, borderColor: colors.blush },
            ]}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.deepIndigo : colors.blush }]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="send" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center",
  },
  headerAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerName: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerStatus: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontFamily: "Inter_400Regular" },
  centred: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40, paddingHorizontal: 24 },
  emptyChatBubble: { borderRadius: 20, paddingHorizontal: 24, paddingVertical: 20, width: "100%" },
  emptyChatText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  emptyChatSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 6, lineHeight: 18 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  messageRowMe: { justifyContent: "flex-end" },
  messageRowThem: { justifyContent: "flex-start" },
  msgAvatar: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  msgAvatarPlaceholder: { width: 30, flexShrink: 0 },
  msgInitials: { fontSize: 11, fontFamily: "Inter_700Bold" },
  senderName: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 3, marginLeft: 2 },
  bubble: { maxWidth: "75%", borderRadius: 18, padding: 12 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4, alignSelf: "flex-end" },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 10,
  },
  inputField: {
    flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, fontFamily: "Inter_400Regular", borderWidth: 1, maxHeight: 100,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
