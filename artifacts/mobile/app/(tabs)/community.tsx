import { AshTreeBackground } from "@/components/AshTreeBackground";
import { LotusIcon } from "@/components/LotusIcon";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  addCommentToPost,
  addPost,
  FSComment,
  FSPost,
  subscribePosts,
  togglePostLike,
} from "@/lib/firestore";

const CIRCLES: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Healing Journey", label: "Healing Journey" },
  { id: "Meditation", label: "Meditation" },
  { id: "Breathwork", label: "Breathwork" },
  { id: "Energy Work", label: "Energy Work" },
  { id: "Spiritual Growth", label: "Spiritual Growth" },
  { id: "Grief & Loss", label: "Grief & Loss" },
  { id: "Gratitude", label: "Gratitude" },
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function relativeTime(ts: any): string {
  if (!ts) return "just now";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}


export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, displayName } = useApp();

  const [activeTab, setActiveTab] = useState<"feed" | "events" | "circles">("feed");
  const [activeCircle, setActiveCircle] = useState("all");
  const [posts, setPosts] = useState<FSPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [posting, setPosting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [commentingOn, setCommentingOn] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const myInitials = getInitials(displayName);

  // Real-time Firestore subscription
  useEffect(() => {
    const unsub = subscribePosts((incoming) => {
      setPosts(incoming);
      setFeedLoading(false);
    });
    return unsub;
  }, []);

  // Filter by circle client-side
  const filteredPosts =
    activeCircle === "all"
      ? posts
      : posts.filter((p) => p.circle === activeCircle);

  const handleToggleLike = async (post: FSPost) => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const liked = post.likedBy.includes(userId);
    // Optimistic update
    setPosts((ps) =>
      ps.map((p) =>
        p.id === post.id
          ? {
              ...p,
              likedBy: liked
                ? p.likedBy.filter((id) => id !== userId)
                : [...p.likedBy, userId],
            }
          : p
      )
    );
    await togglePostLike(post.id, userId, liked);
  };

  const handlePost = async () => {
    if (!newPost.trim() || !userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPosting(true);
    const id = `${userId}_${Date.now()}`;
    const circleName =
      activeCircle === "all"
        ? "Healing Journey"
        : CIRCLES.find((c) => c.id === activeCircle)?.label ?? "Healing Journey";
    await addPost({
      id,
      authorId: userId,
      authorName: displayName ?? "Soul Member",
      authorInitials: myInitials,
      role: "client",
      circle: circleName,
      text: newPost.trim(),
      likedBy: [],
      comments: [],
    });
    setNewPost("");
    setShowCompose(false);
    setPosting(false);
  };

  const handleComment = async (postId: string) => {
    if (!newComment.trim() || !userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const comment: FSComment = {
      id: `${userId}_${Date.now()}`,
      authorId: userId,
      authorName: displayName ?? "Soul Member",
      authorInitials: myInitials,
      text: newComment.trim(),
      createdAtISO: new Date().toISOString(),
    };
    // Optimistic update
    setPosts((ps) =>
      ps.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
      )
    );
    setNewComment("");
    setCommentingOn(null);
    await addCommentToPost(postId, comment);
  };

  const renderPost = ({ item: post }: { item: FSPost }) => {
    const isExpanded = expandedPost === post.id;
    const liked = userId ? post.likedBy.includes(userId) : false;

    return (
      <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
        <View style={styles.postHeader}>
          <LinearGradient colors={[colors.purpleMid, colors.lavender]} style={styles.postAvatar}>
            <Text style={styles.postInitials}>{post.authorInitials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <View style={styles.postMeta}>
              <Text style={[styles.postAuthor, { color: colors.charcoal }]}>{post.authorName}</Text>
              {post.role === "practitioner" && (
                <View style={[styles.practBadge, { backgroundColor: colors.deepIndigo }]}>
                  <Text style={styles.practBadgeText}>HEALER</Text>
                </View>
              )}
              <View style={[styles.circleBadge, { backgroundColor: `${colors.deepIndigo}14` }]}>
                <Text style={[styles.circleBadgeText, { color: colors.deepIndigo }]}>{post.circle}</Text>
              </View>
            </View>
            <Text style={[styles.postTime, { color: colors.sage }]}>{relativeTime(post.createdAt)}</Text>
          </View>
        </View>

        <Text style={[styles.postText, { color: colors.charcoal }]}>{post.text}</Text>

        <View style={[styles.postActions, { borderTopColor: colors.cream }]}>
          <TouchableOpacity onPress={() => handleToggleLike(post)} style={styles.actionBtn}>
            <Feather name="heart" size={16} color={liked ? "#E55" : colors.sage} />
            <Text style={[styles.actionCount, { color: liked ? "#E55" : colors.sage }]}>
              {post.likedBy.length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setExpandedPost(isExpanded ? null : post.id);
              setCommentingOn(isExpanded ? null : post.id);
            }}
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
                  <Text style={[styles.commentInitials, { color: colors.deepIndigo }]}>{c.authorInitials}</Text>
                </View>
                <View style={[styles.commentBubble, { backgroundColor: colors.cream }]}>
                  <Text style={[styles.commentAuthor, { color: colors.charcoal }]}>{c.authorName}</Text>
                  <Text style={[styles.commentText, { color: colors.charcoal }]}>{c.text}</Text>
                  <Text style={[styles.commentTime, { color: colors.sage }]}>
                    {relativeTime({ toDate: () => new Date(c.createdAtISO) })}
                  </Text>
                </View>
              </View>
            ))}

            {userId ? (
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
            ) : (
              <Text style={[styles.signInNote, { color: colors.sage }]}>Sign in to comment</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <AshTreeBackground />
      <LinearGradient
        colors={[colors.deepIndigo, colors.indigo2]}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <LotusIcon size={22} />
          <Text style={styles.headerTitle}>Community</Text>
        </View>
        <Text style={styles.headerSub}>Connect · Share · Heal Together</Text>
      </LinearGradient>

      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.cream }]}>
        {([["feed", "Feed"], ["events", "Live Events"], ["circles", "Circles"]] as const).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            onPress={() => { setActiveTab(id); Haptics.selectionAsync(); }}
            style={[styles.tabItem, { borderBottomColor: activeTab === id ? colors.deepIndigo : "transparent" }]}
          >
            <Text style={[styles.tabLabel, { color: activeTab === id ? colors.deepIndigo : colors.sage }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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

      {activeTab === "feed" && (
        feedLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.deepIndigo} size="large" />
            <Text style={[styles.loadingText, { color: colors.sage }]}>Loading community…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPosts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.sage }]}>
                  No posts yet. Be the first to share!
                </Text>
              </View>
            }
            ListHeaderComponent={
              userId ? (
                !showCompose ? (
                  <TouchableOpacity
                    onPress={() => setShowCompose(true)}
                    style={[styles.composePrompt, { backgroundColor: colors.card, borderColor: colors.cream }]}
                  >
                    <View style={[styles.composeAvatar, { backgroundColor: colors.blush }]}>
                      <Text style={{ color: colors.deepIndigo, fontFamily: "Inter_700Bold", fontSize: 14 }}>
                        {myInitials}
                      </Text>
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
                        disabled={!newPost.trim() || posting}
                        style={[styles.composePost, { backgroundColor: newPost.trim() ? colors.deepIndigo : colors.blush }]}
                      >
                        {posting ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.composePostText}>Share</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              ) : (
                <View style={[styles.signInPrompt, { backgroundColor: colors.card, borderColor: colors.cream }]}>
                  <Text style={[styles.signInPromptText, { color: colors.sage }]}>
                    Sign in from your Profile to share & interact
                  </Text>
                </View>
              )
            }
            renderItem={renderPost}
          />
        )
      )}

      {activeTab === "events" && (
        <View style={[styles.emptyWrap, { flex: 1 }]}>
          <Feather name="calendar" size={36} color={colors.blush} />
          <Text style={[styles.emptyText, { color: colors.sage, marginTop: 14 }]}>
            No upcoming events yet.{"\n"}Check back soon — new events are added regularly.
          </Text>
        </View>
      )}

      {activeTab === "circles" && (
        <View style={[styles.emptyWrap, { flex: 1 }]}>
          <Feather name="users" size={36} color={colors.blush} />
          <Text style={[styles.emptyText, { color: colors.sage, marginTop: 14 }]}>
            Circles are coming soon.{"\n"}This is where healing communities will gather.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 2 },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_400Regular" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2.5 },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  circleBar: { paddingVertical: 10, borderBottomWidth: 1 },
  circleChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  circleChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyWrap: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  signInPrompt: {
    borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 12, alignItems: "center",
  },
  signInPromptText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  signInNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
  composePrompt: {
    borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center",
    gap: 12, borderWidth: 1, marginBottom: 12,
  },
  composeAvatar: {
    width: 36, height: 36, borderRadius: 11, alignItems: "center",
    justifyContent: "center", flexShrink: 0,
  },
  composePlaceholder: { fontSize: 14, fontFamily: "Inter_400Regular" },
  composeBox: { borderRadius: 18, padding: 16, borderWidth: 1.5, marginBottom: 12 },
  composeInput: {
    borderRadius: 12, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular",
    lineHeight: 22, minHeight: 80, textAlignVertical: "top", marginBottom: 12,
  },
  composeBtns: { flexDirection: "row", gap: 8 },
  composeCancel: { flex: 1, borderRadius: 12, padding: 11, alignItems: "center" },
  composeCancelText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  composePost: { flex: 2, borderRadius: 12, padding: 11, alignItems: "center" },
  composePostText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  postCard: {
    borderRadius: 20, overflow: "hidden", borderWidth: 1, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8, elevation: 2,
  },
  postHeader: { flexDirection: "row", gap: 10, padding: 14, paddingBottom: 8 },
  postAvatar: {
    width: 40, height: 40, borderRadius: 12, alignItems: "center",
    justifyContent: "center", flexShrink: 0,
  },
  postInitials: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  postMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  postAuthor: { fontSize: 13, fontFamily: "Inter_700Bold" },
  practBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  practBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  circleBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  circleBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  postTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  postText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, paddingHorizontal: 14, paddingBottom: 10 },
  postActions: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, gap: 20 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionCount: { fontSize: 13, fontFamily: "Inter_500Medium" },
  commentsSection: { borderTopWidth: 1, padding: 14, gap: 10 },
  comment: { flexDirection: "row", gap: 8 },
  commentAvatar: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentInitials: { fontSize: 10, fontFamily: "Inter_700Bold" },
  commentBubble: { flex: 1, borderRadius: 12, padding: 10 },
  commentAuthor: { fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 2 },
  commentText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  commentTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4 },
  commentInput: { flexDirection: "row", gap: 8, marginTop: 4 },
  commentField: {
    flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 13, fontFamily: "Inter_400Regular", borderWidth: 1,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  eventCard: {
    borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", borderWidth: 1, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  eventLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 },
  eventAvatar: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  eventInitials: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  eventTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20, marginBottom: 2 },
  eventHost: { fontSize: 12, fontFamily: "Inter_400Regular" },
  eventTime: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 3 },
  eventType: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  goingBtn: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, marginLeft: 10, flexShrink: 0 },
  goingBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  circleTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 6 },
  circleBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 18 },
  circleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  circleCardWrap: { width: "47%" },
  circleCard: { borderRadius: 18, padding: 18, minHeight: 110, justifyContent: "flex-end" },
  circleCardLabel: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4 },
  circleCardCount: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 10 },
  joinCircleBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  joinCircleBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
