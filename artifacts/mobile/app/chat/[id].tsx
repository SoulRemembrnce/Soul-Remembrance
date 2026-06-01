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
  FSConversation,
  FSMessage,
  getConversation,
  getPractitionerProfileByNumericId,
  getPushTokenForUserId,
  markConversationRead,
  sendMessage,
  subscribeMessages,
} from "@/lib/firestore";
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

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();

  const [conv, setConv] = useState<FSConversation | null>(null);
  const [messages, setMessages] = useState<FSMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Load conversation metadata once
  useEffect(() => {
    if (!id) return;
    getConversation(id).then((c) => setConv(c));
    if (userId) markConversationRead(id).catch(() => {});
  }, [id, userId]);

  // Subscribe to messages in real-time
  useEffect(() => {
    if (!id) return;
    const unsub = subscribeMessages(id, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      // Scroll to bottom whenever new messages arrive
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [id]);

  const handleSend = async () => {
    if (!input.trim() || !userId || !id || !conv) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await sendMessage(id, userId, text);

      // ── Push-notify the other participant ──────────────────────────────
      const isClient = userId === conv.userId;
      if (isClient) {
        // Client sent → notify practitioner
        getPractitionerProfileByNumericId(conv.practitionerId)
          .then(async (profile) => {
            if (!profile?.userId) return;
            const token = await getPushTokenForUserId(profile.userId);
            if (token) {
              await sendExpoPush(
                token,
                `New message from ${conv.otherName}`,
                text.length > 80 ? text.slice(0, 80) + "…" : text,
                { router: `/chat/${id}` }
              );
            }
          })
          .catch(() => {});
      } else {
        // Practitioner sent → notify client
        getPushTokenForUserId(conv.userId)
          .then(async (token) => {
            if (token) {
              await sendExpoPush(
                token,
                `New message from ${conv.otherName}`,
                text.length > 80 ? text.slice(0, 80) + "…" : text,
                { router: `/chat/${id}` }
              );
            }
          })
          .catch(() => {});
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        {conv && (
          <LinearGradient
            colors={conv.otherAvatarColor as [string, string]}
            style={styles.headerAvatar}
          >
            <Text style={styles.headerInitials}>{conv.otherInitials}</Text>
          </LinearGradient>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{conv?.otherName ?? "Chat"}</Text>
          <Text style={styles.headerStatus}>Soul Remembrance</Text>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Feather name="more-vertical" size={18} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
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
            contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <View style={[styles.emptyChatBubble, { backgroundColor: colors.cream }]}>
                  <Text style={[styles.emptyChatText, { color: colors.sage }]}>
                    Say hello to {conv?.otherName ?? "your practitioner"} 👋
                  </Text>
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.senderId === userId;
              return (
                <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
                  {!isMe && conv && (
                    <LinearGradient
                      colors={conv.otherAvatarColor as [string, string]}
                      style={styles.msgAvatar}
                    >
                      <Text style={styles.msgInitials}>{conv.otherInitials[0]}</Text>
                    </LinearGradient>
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
            placeholder="Message..."
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
  headerInitials: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  headerName: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerStatus: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontFamily: "Inter_400Regular" },
  headerAction: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center",
  },
  centred: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyChatBubble: { borderRadius: 18, paddingHorizontal: 20, paddingVertical: 14 },
  emptyChatText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  messageRowMe: { justifyContent: "flex-end" },
  messageRowThem: { justifyContent: "flex-start" },
  msgAvatar: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  msgInitials: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
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
