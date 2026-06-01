import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
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

import { CHAT_MESSAGES, ChatMessage, THREADS } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const thread = THREADS.find((t) => String(t.id) === id);
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_MESSAGES[Number(id)] || []);
  const [input, setInput] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: input.trim(), from: "me", time: "now" },
    ]);
    setInput("");
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
        {thread && (
          <LinearGradient colors={thread.avatarColor as [string, string]} style={styles.headerAvatar}>
            <Text style={styles.headerInitials}>{thread.initials}</Text>
          </LinearGradient>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{thread?.from ?? "Chat"}</Text>
          <Text style={styles.headerStatus}>Active now</Text>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Feather name="more-vertical" size={18} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageRow,
                item.from === "me" ? styles.messageRowMe : styles.messageRowThem,
              ]}
            >
              {item.from === "them" && thread && (
                <LinearGradient colors={thread.avatarColor as [string, string]} style={styles.msgAvatar}>
                  <Text style={styles.msgInitials}>{thread.initials[0]}</Text>
                </LinearGradient>
              )}
              <View
                style={[
                  styles.bubble,
                  item.from === "me"
                    ? [styles.bubbleMe, { backgroundColor: colors.deepIndigo }]
                    : [styles.bubbleThem, { backgroundColor: colors.card, borderColor: colors.cream }],
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    { color: item.from === "me" ? "#fff" : colors.charcoal },
                  ]}
                >
                  {item.text}
                </Text>
                <Text
                  style={[
                    styles.bubbleTime,
                    { color: item.from === "me" ? "rgba(255,255,255,0.55)" : colors.sage },
                  ]}
                >
                  {item.time}
                </Text>
              </View>
            </View>
          )}
        />

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: bottomPad + 8,
              backgroundColor: colors.card,
              borderTopColor: colors.cream,
            },
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
            disabled={!input.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: input.trim() ? colors.deepIndigo : colors.blush },
            ]}
          >
            <Feather name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInitials: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  headerName: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  headerStatus: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageRowThem: {
    justifyContent: "flex-start",
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  msgInitials: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 18,
    padding: 12,
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  bubbleTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  inputField: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
