import { Feather } from "@expo/vector-icons";
import { LotusIcon } from "@/components/LotusIcon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Circle, Defs, G, Line, LinearGradient as SvgGradient, Path, Stop, Svg, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  addMoodCheckin,
  deleteMoodCheckin,
  FSMoodCheckin,
  subscribeMoodCheckins,
} from "@/lib/firestore";

const SCREEN_W = Dimensions.get("window").width;

const MOODS = [
  { emoji: "😄", label: "Joyful",      score: 9, color: "#F59E0B" },
  { emoji: "🌟", label: "Inspired",    score: 8, color: "#C9A84C" },
  { emoji: "💜", label: "Grateful",    score: 8, color: "#8B5CF6" },
  { emoji: "😌", label: "Calm",        score: 7, color: "#6B4FA8" },
  { emoji: "🌊", label: "Flowing",     score: 6, color: "#3D9BE9" },
  { emoji: "🌿", label: "Grounded",    score: 6, color: "#16A34A" },
  { emoji: "🥱", label: "Low Energy",  score: 4, color: "#8A7050" },
  { emoji: "😔", label: "Processing",  score: 3, color: "#6B7280" },
  { emoji: "😰", label: "Anxious",     score: 2, color: "#DC2626" },
  { emoji: "😤", label: "Frustrated",  score: 2, color: "#EA580C" },
] as const;

type MoodItem = (typeof MOODS)[number];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── SVG Chart ─────────────────────────────────────────────────────────────────

const PAD_X = 24;
const PAD_Y = 14;

function MoodChart({ entries }: { entries: FSMoodCheckin[] }) {
  const colors = useColors();

  const chartData = useMemo(() => {
    const sorted = [...entries]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-14);
    return sorted;
  }, [entries]);

  const W = SCREEN_W - 40;
  const H = 130;

  if (chartData.length < 2) return null;

  const xs = chartData.map((_, i) => PAD_X + (i / (chartData.length - 1)) * (W - PAD_X * 2));
  const ys = chartData.map(d => H - PAD_Y - ((d.moodScore - 1) / 9) * (H - PAD_Y * 2));

  let linePath = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const cpx = (xs[i] + xs[i + 1]) / 2;
    linePath += ` C ${cpx} ${ys[i]}, ${cpx} ${ys[i + 1]}, ${xs[i + 1]} ${ys[i + 1]}`;
  }
  const areaPath = linePath + ` L ${xs[xs.length - 1]} ${H} L ${xs[0]} ${H} Z`;

  const moodMap = Object.fromEntries(MOODS.map(m => [m.label, m]));

  return (
    <View style={{ marginBottom: 4 }}>
      <Svg width={W} height={H} style={{ overflow: "visible" }}>
        <Defs>
          <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#6B4FA8" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#6B4FA8" stopOpacity="0.02" />
          </SvgGradient>
        </Defs>
        {/* Horizontal grid lines */}
        {[2, 5, 7, 9].map(v => {
          const y = H - PAD_Y - ((v - 1) / 9) * (H - PAD_Y * 2);
          return (
            <Line key={v} x1={PAD_X} y1={y} x2={W - PAD_X} y2={y}
              stroke="#DDD0F0" strokeWidth={0.8} strokeDasharray="4,4" />
          );
        })}
        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />
        {/* Line */}
        <Path d={linePath} fill="none" stroke="#6B4FA8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {chartData.map((d, i) => {
          const m = moodMap[d.moodLabel];
          const dotColor = m?.color ?? "#6B4FA8";
          const isLast = i === chartData.length - 1;
          return (
            <G key={d.id}>
              <Circle cx={xs[i]} cy={ys[i]} r={isLast ? 6 : 4} fill={dotColor} stroke="#fff" strokeWidth={2} />
              {isLast && (
                <SvgText x={xs[i]} y={ys[i] - 14} textAnchor="middle" fontSize={14}>{d.mood}</SvgText>
              )}
            </G>
          );
        })}
      </Svg>
      {/* X-axis labels */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: PAD_X, marginTop: 4 }}>
        {chartData.map((d, i) => {
          if (i !== 0 && i !== chartData.length - 1 && i !== Math.floor(chartData.length / 2)) return null;
          const parts = d.dateKey.split("-");
          const label = `${parseInt(parts[2])} ${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(parts[1])]}`;
          return <Text key={d.id} style={{ color: "#8A7050", fontSize: 9, fontFamily: "Inter_600SemiBold" }}>{label}</Text>;
        })}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

type Tab = "checkin" | "history";

export default function MoodTrackerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, isAnonymous } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [tab, setTab] = useState<Tab>("checkin");
  const [entries, setEntries] = useState<FSMoodCheckin[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodItem>(MOODS[3]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const todayEntry = useMemo(
    () => entries.find(e => e.dateKey === todayKey()),
    [entries]
  );

  const avgScore = useMemo(() => {
    if (!entries.length) return null;
    const recent = entries.slice(0, 30);
    return (recent.reduce((s, e) => s + e.moodScore, 0) / recent.length).toFixed(1);
  }, [entries]);

  const streak = useMemo(() => {
    const keys = new Set(entries.map(e => e.dateKey));
    let count = 0;
    const d = new Date();
    while (keys.has(d.toISOString().slice(0, 10))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [entries]);

  useEffect(() => {
    if (!userId || isAnonymous) return;
    return subscribeMoodCheckins(userId, setEntries);
  }, [userId, isAnonymous]);

  const handleSave = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await addMoodCheckin(userId, {
        mood: selectedMood.emoji,
        moodLabel: selectedMood.label,
        moodScore: selectedMood.score,
        note: note.trim(),
        dateKey: todayKey(),
      });
      setNote("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTab("history");
    } catch (err: unknown) {
      console.error("[MoodTracker] Save error:", err);
      const code = (err as { code?: string })?.code;
      if (code === "permission-denied") {
        Alert.alert("Permission Denied", "Please update your Firestore security rules in the Firebase Console to allow writes to users/{uid}/moodCheckins.");
      } else {
        Alert.alert("Error", "Could not save check-in. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }, [userId, selectedMood, note]);

  const handleDelete = useCallback((entry: FSMoodCheckin) => {
    if (!userId) return;
    Alert.alert("Remove check-in?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteMoodCheckin(userId, entry.id).catch(console.warn) },
    ]);
  }, [userId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      {/* Header */}
      <LinearGradient colors={[colors.deepIndigo, colors.indigo2]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>EMOTIONAL WELLNESS</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2 }}>
            <LotusIcon size={20} />
            <Text style={styles.headerTitle}>Mood Tracker</Text>
          </View>
          {entries.length > 0 && (
            <Text style={styles.headerSub}>{entries.length} check-ins recorded</Text>
          )}
        </View>
      </LinearGradient>

      {/* Tab switcher */}
      <View style={[styles.tabBar, { borderBottomColor: colors.blush }]}>
        {(["checkin", "history"] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && { borderBottomColor: colors.deepIndigo, borderBottomWidth: 2 }]}
            onPress={() => { Haptics.selectionAsync(); setTab(t); }}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.deepIndigo : colors.sage }]}>
              {t === "checkin" ? "✦  Daily Check-In" : "📊  History"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isAnonymous ? (
        <View style={styles.centreWrap}>
          <Text style={styles.bigEmoji}>🌈</Text>
          <Text style={[styles.centreTitle, { color: colors.charcoal }]}>Sign in to track your mood</Text>
          <Text style={[styles.centreBody, { color: colors.sage }]}>
            Daily check-ins help you understand your emotional patterns over time. Sign in to get started.
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.deepIndigo }]}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>Sign in to your account</Text>
          </TouchableOpacity>
        </View>
      ) : tab === "checkin" ? (
        /* ── CHECK-IN TAB ─────────────────────────────────────────────────── */
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {todayEntry ? (
              /* Already checked in today */
              <View>
                <View style={[styles.alreadyCard, { backgroundColor: `${colors.purpleMid}10`, borderColor: `${colors.purpleMid}25` }]}>
                  <Text style={{ fontSize: 48, textAlign: "center", marginBottom: 10 }}>{todayEntry.mood}</Text>
                  <Text style={[styles.alreadyLabel, { color: colors.purpleMid }]}>Today you felt {todayEntry.moodLabel}</Text>
                  {todayEntry.note !== "" && (
                    <Text style={[styles.alreadyNote, { color: colors.sage }]}>"{todayEntry.note}"</Text>
                  )}
                  <TouchableOpacity onPress={() => setTab("history")} style={[styles.historyBtn, { backgroundColor: colors.deepIndigo }]}>
                    <Text style={styles.historyBtnText}>View your mood history</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Mood picker */
              <View>
                <Text style={[styles.promptText, { color: colors.charcoal }]}>How are you feeling today?</Text>
                <Text style={[styles.promptSub, { color: colors.sage }]}>
                  {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                </Text>

                {/* Selected mood big display */}
                <View style={styles.selectedWrap}>
                  <View style={[styles.selectedCircle, { backgroundColor: `${selectedMood.color}15`, borderColor: `${selectedMood.color}40` }]}>
                    <Text style={styles.selectedEmoji}>{selectedMood.emoji}</Text>
                  </View>
                  <Text style={[styles.selectedLabel, { color: selectedMood.color }]}>{selectedMood.label}</Text>
                </View>

                {/* Mood grid */}
                <View style={styles.moodGrid}>
                  {MOODS.map(m => (
                    <TouchableOpacity
                      key={m.label}
                      style={[
                        styles.moodOption,
                        {
                          backgroundColor: selectedMood.label === m.label ? `${m.color}15` : colors.cream,
                          borderColor: selectedMood.label === m.label ? m.color : "transparent",
                        },
                      ]}
                      onPress={() => { setSelectedMood(m); Haptics.selectionAsync(); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.moodEmoji}>{m.emoji}</Text>
                      <Text style={[styles.moodOptionLabel, { color: selectedMood.label === m.label ? m.color : colors.sage }]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Note */}
                <Text style={[styles.noteLabel, { color: colors.sage }]}>ADD A NOTE (optional)</Text>
                <TextInput
                  style={[styles.noteInput, { color: colors.charcoal, borderColor: colors.blush, backgroundColor: colors.card }]}
                  placeholder="What's present for you right now…"
                  placeholderTextColor={colors.sage}
                  multiline
                  value={note}
                  onChangeText={setNote}
                  textAlignVertical="top"
                  maxLength={280}
                />

                {/* Save */}
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.deepIndigo, opacity: saving ? 0.5 : 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save today's check-in  ✦"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* ── HISTORY TAB ──────────────────────────────────────────────────── */
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {entries.length === 0 ? (
            <View style={styles.centreWrap}>
              <Text style={styles.bigEmoji}>🌈</Text>
              <Text style={[styles.centreTitle, { color: colors.charcoal }]}>No check-ins yet</Text>
              <Text style={[styles.centreBody, { color: colors.sage }]}>
                Start your first daily check-in to see your emotional patterns unfold over time.
              </Text>
              <TouchableOpacity
                style={[styles.historyBtn, { backgroundColor: colors.deepIndigo, marginTop: 20 }]}
                onPress={() => setTab("checkin")}
              >
                <Text style={styles.historyBtnText}>Do today's check-in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Stats */}
              <View style={styles.statsRow}>
                {[
                  { emoji: "📊", label: "Avg Mood", value: avgScore ? `${avgScore}/10` : "—" },
                  { emoji: "🔥", label: "Streak",   value: `${streak} day${streak !== 1 ? "s" : ""}` },
                  { emoji: "✅", label: "Total",     value: String(entries.length) },
                ].map(s => (
                  <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.blush }]}>
                    <Text style={styles.statEmoji}>{s.emoji}</Text>
                    <Text style={[styles.statValue, { color: colors.deepIndigo }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.sage }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Chart */}
              {entries.length >= 2 && (
                <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.blush }]}>
                  <Text style={[styles.sectionLabel, { color: colors.sage }]}>LAST {Math.min(entries.length, 14)} DAYS</Text>
                  <MoodChart entries={entries} />
                </View>
              )}

              {/* Entry list */}
              <Text style={[styles.sectionLabel, { color: colors.sage, marginBottom: 10 }]}>RECENT CHECK-INS</Text>
              <View style={{ gap: 10 }}>
                {entries.map(entry => {
                  const moodInfo = MOODS.find(m => m.label === entry.moodLabel) ?? MOODS[3];
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.blush }]}
                      onLongPress={() => handleDelete(entry)}
                      activeOpacity={0.88}
                    >
                      <View style={[styles.entryMoodBox, { backgroundColor: `${moodInfo.color}15` }]}>
                        <Text style={styles.entryEmoji}>{entry.mood}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.entryMoodLabel, { color: colors.charcoal }]}>{entry.moodLabel}</Text>
                        {entry.note !== "" && (
                          <Text style={[styles.entryNote, { color: colors.sage }]} numberOfLines={2}>"{entry.note}"</Text>
                        )}
                        <Text style={[styles.entryDate, { color: colors.sage }]}>{formatEntryDate(entry.createdAt)}</Text>
                      </View>
                      <View style={[styles.scoreBadge, { backgroundColor: `${moodInfo.color}18` }]}>
                        <Text style={[styles.scoreText, { color: moodInfo.color }]}>{entry.moodScore}/10</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.holdHint, { color: colors.blush }]}>Hold an entry to remove it</Text>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  headerLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 14 },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  centreWrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 24 },
  bigEmoji: { fontSize: 64, marginBottom: 20 },
  centreTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 10 },
  centreBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, maxWidth: 300 },
  promptText: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 4 },
  promptSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 24 },
  selectedWrap: { alignItems: "center", marginBottom: 24 },
  selectedCircle: { width: 86, height: 86, borderRadius: 28, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  selectedEmoji: { fontSize: 46 },
  selectedLabel: { fontSize: 17, fontFamily: "Inter_700Bold" },
  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24, justifyContent: "center" },
  moodOption: { alignItems: "center", borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10, borderWidth: 1.5, width: "18%" },
  moodEmoji: { fontSize: 22, marginBottom: 4 },
  moodOptionLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
  noteLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 8 },
  noteInput: { minHeight: 90, fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 20 },
  saveBtn: { borderRadius: 18, padding: 17, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  alreadyCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center" },
  alreadyLabel: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 8, textAlign: "center" },
  alreadyNote: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic", textAlign: "center", marginBottom: 20, lineHeight: 21 },
  historyBtn: { borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  historyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: "center" },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  chartCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 12 },
  entryCard: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  entryMoodBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  entryEmoji: { fontSize: 22 },
  entryMoodLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  entryNote: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic", marginBottom: 3 },
  entryDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  scoreText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  holdHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 16 },
});
