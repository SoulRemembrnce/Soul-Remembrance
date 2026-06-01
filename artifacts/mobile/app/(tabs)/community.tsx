import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CIRCLES, EVENTS, Post, POSTS } from "@/constants/data";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const LIVE_EVENTS = [
  { id: 1, title: "Full Moon Meditation Circle", host: "Luna Ashford", hostInitials: "LA", time: "Tonight · 8:00 PM", type: "Live Online", spots: 8 },
  { id: 2, title: "Breathwork for Anxiety Relief", host: "Marcus Rivera", hostInitials: "MR", time: "Thu 5 Jun · 7:00 PM", type: "Live Online", spots: 14 },
  { id: 3, title: "Ayurvedic Spring Cleanse Q&A", host: "Priya Nair", hostInitials: "PN", time: "Sat 7 Jun · 11:00 AM", type: "Live Online", spots: 20 },
  { id: 4, title: "Sound Bath & Cacao Ceremony", host: "Ayla Storm", hostInitials: "AS", time: "Sun 8 Jun · 6:00 PM", type: "In-Person · Bristol", spots: 6 },
];

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { goingEvents, toggleGoingEvent } = useApp();

  const [activeTab, setActiveTab] = useState<"feed" | "events" | "circles">("feed");
  const [activeCircle, setActiveCircle] = useState("all");
  const [posts, setPosts] = useState<Post[]>(POSTS);
  const [newPost, setNewPost] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const toggleLike = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPosts((ps) =>
      ps.map((p) =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
      )
    );
  };

  const handlePost = () => {
    if (!newPost.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPosts((ps) => [
      {
        id: Date.now(),
        author: "Amara Johnson",
        initials: "AJ",
        role: "client",
        circle: "Healing Journey",
        time: "just now",
        text: newPost.trim(),
        likes: 0,
        liked: false,
        comments: [],
      },
      ...ps,
    ]);
    setNewPost("");
    setShowCompose(false);
  };

  const handleComment = (postId: number) => {
    if (!newComment.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPosts((ps) =>
      ps.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                { id: Date.now(), author: "Amara J.", initials: "AJ", text: newComment.trim(), time: "just now" },
              ],
            }
          : p
      )
    );
    setNewComment("");
  };

  const renderPost = ({ item: post }: { item: Post }) => {
    const isExpanded = expandedPost === post.id;
    return (
      <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
        <View style={styles.postHeader}>
          <LinearGradient colors={[colors.purpleMid, colors.lavender]} style={styles.postAvatar}>
            <Text style={styles.postInitials}>{post.initials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <View style={styles.postMeta}>
              <Text style={[styles.postAuthor, { color: colors.charcoal }]}>{post.author}</Text>
              {post.role === "practitioner" && (
                <View style={[styles.practBadge, { backgroundColor: colors.deepIndigo }]}>
                  <Text style={styles.practBadgeText}>HEALER</Text>
                </View>
              )}
              <View style={[styles.circleBadge, { backgroundColor: `${colors.deepIndigo}14` }]}>
                <Text style={[styles.circleBadgeText, { color: colors.deepIndigo }]}>{post.circle}</Text>
              </View>
            </View>
            <Text style={[styles.postTime, { color: colors.sage }]}>{post.time}</Text>
          </View>
        </View>
        <Text style={[styles.postText, { color: colors.charcoal }]}>{post.text}</Text>
        <View style={[styles.postActions, { borderTopColor: colors.cream }]}>
          <TouchableOpacity onPress={() => toggleLike(post.id)} style={styles.actionBtn}>
            <Feather name="heart" size={16} color={post.liked ? "#E55" : colors.sage} />
            <Text style={[styles.actionCount, { color: post.liked ? "#E55" : colors.sage }]}>{post.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setExpandedPost(isExpanded ? null : post.id)}
            style={styles.actionBtn}
          >
            <Feather name="message-circle" size={16} color={colors.sage} />
            <Text style={[styles.actionCount, { color: colors.sage }]}>{post.comments.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Feather name="share-2" size={16} color={colors.sage} />
          </TouchableOpacity>
        </View>
        {isExpanded && (
          <View style={[styles.commentsSection, { borderTopColor: colors.cream }]}>
            {post.comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <View style={[styles.commentAvatar, { backgroundColor: colors.cream }]}>
                  <Text style={[styles.commentInitials, { color: colors.deepIndigo }]}>{c.initials}</Text>
                </View>
                <View style={[styles.commentBubble, { backgroundColor: colors.cream }]}>
                  <Text style={[styles.commentAuthor, { color: colors.charcoal }]}>{c.author}</Text>
                  <Text style={[styles.commentText, { color: colors.charcoal }]}>{c.text}</Text>
                  <Text style={[styles.commentTime, { color: colors.sage }]}>{c.time}</Text>
                </View>
              </View>
            ))}
            <View style={styles.commentInput}>
              <TextInput
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add a comment..."
                placeholderTextColor={colors.sage}
                style={[
                  styles.commentField,
                  { backgroundColor: colors.cream, color: colors.charcoal, borderColor: colors.blush },
                ]}
                returnKeyType="send"
                onSubmitEditing={() => handleComment(post.id)}
              />
              <TouchableOpacity
                onPress={() => handleComment(post.id)}
                style={[styles.sendBtn, { backgroundColor: colors.deepIndigo }]}
              >
                <Feather name="send" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <Text style={styles.headerTitle}>Community</Text>
        <Text style={styles.headerSub}>Connect · Share · Heal Together</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.cream }]}>
        {([["feed", "Feed"], ["events", "Live Events"], ["circles", "Circles"]] as const).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            onPress={() => {
              setActiveTab(id);
              Haptics.selectionAsync();
            }}
            style={[
              styles.tabItem,
              { borderBottomColor: activeTab === id ? colors.deepIndigo : "transparent" },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === id ? colors.deepIndigo : colors.sage },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Circle filters (feed only) */}
      {activeTab === "feed" && (
        <View style={[styles.circleBar, { backgroundColor: colors.card, borderBottomColor: colors.cream }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {CIRCLES.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setActiveCircle(c.id)}
                style={[
                  styles.circleChip,
                  { backgroundColor: activeCircle === c.id ? colors.deepIndigo : colors.cream, marginRight: 8 },
                ]}
              >
                <Text style={[styles.circleChipText, { color: activeCircle === c.id ? "#fff" : colors.charcoal }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {activeTab === "feed" && (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !showCompose ? (
              <TouchableOpacity
                onPress={() => setShowCompose(true)}
                style={[styles.composePrompt, { backgroundColor: colors.card, borderColor: colors.cream }]}
              >
                <View style={[styles.composeAvatar, { backgroundColor: colors.blush }]}>
                  <Text style={{ color: colors.deepIndigo, fontFamily: "Inter_700Bold", fontSize: 14 }}>AJ</Text>
                </View>
                <Text style={[styles.composePlaceholder, { color: colors.blush }]}>
                  Share something with the community...
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.composeBox, { backgroundColor: colors.card, borderColor: colors.deepIndigo }]}>
                <TextInput
                  value={newPost}
                  onChangeText={setNewPost}
                  placeholder="Share your healing journey, ask questions, offer wisdom..."
                  placeholderTextColor={colors.sage}
                  multiline
                  numberOfLines={4}
                  style={[styles.composeInput, { backgroundColor: colors.cream, color: colors.charcoal }]}
                  autoFocus
                />
                <View style={styles.composeBtns}>
                  <TouchableOpacity
                    onPress={() => { setShowCompose(false); setNewPost(""); }}
                    style={[styles.composeCancel, { backgroundColor: colors.cream }]}
                  >
                    <Text style={[styles.composeCancelText, { color: colors.charcoal }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handlePost}
                    style={[
                      styles.composePost,
                      { backgroundColor: newPost.trim() ? colors.deepIndigo : colors.blush },
                    ]}
                    disabled={!newPost.trim()}
                  >
                    <Text style={styles.composePostText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }
          renderItem={renderPost}
        />
      )}

      {activeTab === "events" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {LIVE_EVENTS.map((ev) => (
            <View
              key={ev.id}
              style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.cream }]}
            >
              <View style={styles.eventLeft}>
                <LinearGradient colors={[colors.deepIndigo, colors.lavenderMid]} style={styles.eventAvatar}>
                  <Text style={styles.eventInitials}>{ev.hostInitials}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventTitle, { color: colors.charcoal }]}>{ev.title}</Text>
                  <Text style={[styles.eventHost, { color: colors.sage }]}>with {ev.host}</Text>
                  <Text style={[styles.eventTime, { color: colors.purpleMid }]}>{ev.time}</Text>
                  <Text style={[styles.eventType, { color: colors.sage }]}>{ev.type}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  toggleGoingEvent(ev.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                style={[
                  styles.goingBtn,
                  {
                    backgroundColor: goingEvents.has(ev.id) ? colors.deepIndigo : colors.cream,
                    borderColor: colors.deepIndigo,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.goingBtnText,
                    { color: goingEvents.has(ev.id) ? "#fff" : colors.deepIndigo },
                  ]}
                >
                  {goingEvents.has(ev.id) ? "Going" : "Join"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === "circles" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <Text style={[styles.circleTitle, { color: colors.charcoal }]}>Healing Circles</Text>
          <Text style={[styles.circleBody, { color: colors.sage }]}>
            Join circles to connect with others on similar healing journeys.
          </Text>
          <View style={styles.circleGrid}>
            {[
              { label: "Healing Journey", count: 1240, colors: [colors.deepIndigo, colors.lavenderMid] },
              { label: "Sound Healing", count: 487, colors: [colors.purpleMid, "#9B7FD4"] },
              { label: "Breathwork", count: 352, colors: ["#1A4D2E", "#3A8C5C"] },
              { label: "Ayurveda", count: 228, colors: [colors.purpleMid, colors.lavender] },
              { label: "Reiki", count: 315, colors: ["#6B1F6B", "#A855A8"] },
              { label: "Meditation", count: 892, colors: ["#0D3B6E", "#1A6EAD"] },
              { label: "Events & Retreats", count: 576, colors: [colors.deepIndigo, colors.indigo2] },
              { label: "EFT Tapping", count: 143, colors: ["#7A4A00", "#C9A84C"] },
            ].map((circle) => (
              <TouchableOpacity
                key={circle.label}
                activeOpacity={0.85}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                style={styles.circleCardWrap}
              >
                <LinearGradient colors={circle.colors as [string, string]} style={styles.circleCard}>
                  <Text style={styles.circleCardLabel}>{circle.label}</Text>
                  <Text style={styles.circleCardCount}>{circle.count.toLocaleString()} members</Text>
                  <View style={[styles.joinCircleBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                    <Text style={styles.joinCircleBtnText}>Join</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  headerSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2.5,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  circleBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  circleChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  circleChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  composePrompt: {
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  composeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  composePlaceholder: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  composeBox: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  composeInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  composeBtns: {
    flexDirection: "row",
    gap: 8,
  },
  composeCancel: {
    flex: 1,
    borderRadius: 12,
    padding: 11,
    alignItems: "center",
  },
  composeCancelText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  composePost: {
    flex: 2,
    borderRadius: 12,
    padding: 11,
    alignItems: "center",
  },
  composePostText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  postCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingBottom: 8,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  postInitials: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  postMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  postAuthor: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  practBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  practBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  circleBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  circleBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  postTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  postText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  postActions: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionCount: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  commentsSection: {
    borderTopWidth: 1,
    padding: 14,
    gap: 10,
  },
  comment: {
    flexDirection: "row",
    gap: 8,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentInitials: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  commentBubble: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
  },
  commentAuthor: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  commentTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  commentInput: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  commentField: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  eventCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  eventLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  eventAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eventInitials: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  eventTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
    marginBottom: 2,
  },
  eventHost: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  eventTime: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 3,
  },
  eventType: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  goingBtn: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    marginLeft: 10,
    flexShrink: 0,
  },
  goingBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  circleTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  circleBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 18,
  },
  circleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  circleCardWrap: {
    width: "47%",
  },
  circleCard: {
    borderRadius: 18,
    padding: 16,
  },
  circleCardLabel: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  circleCardCount: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  joinCircleBtn: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  joinCircleBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
