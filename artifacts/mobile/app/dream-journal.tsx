import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
  addDreamEntry,
  deleteDreamEntry,
  FSDreamEntry,
  subscribeDreamEntries,
  updateDreamEntryAnalysis,
} from "@/lib/firestore";

// ─── Moon Phase ───────────────────────────────────────────────────────────────

const KNOWN_NEW_MOON = new Date("2000-01-06T18:14:00Z").getTime();
const SYNODIC_PERIOD = 29.530589;

function getMoonPhase(dateStr: string): { emoji: string; name: string; illumination: number } {
  const date = new Date(dateStr);
  const elapsed = (date.getTime() - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
  const phase = ((elapsed % SYNODIC_PERIOD) + SYNODIC_PERIOD) % SYNODIC_PERIOD;
  const illumination = Math.round((phase / SYNODIC_PERIOD) * 100);
  if (phase < 1.85)  return { emoji: "🌑", name: "New Moon",        illumination };
  if (phase < 7.38)  return { emoji: "🌒", name: "Waxing Crescent", illumination };
  if (phase < 9.22)  return { emoji: "🌓", name: "First Quarter",   illumination };
  if (phase < 14.77) return { emoji: "🌔", name: "Waxing Gibbous",  illumination };
  if (phase < 16.61) return { emoji: "🌕", name: "Full Moon",       illumination };
  if (phase < 22.15) return { emoji: "🌖", name: "Waning Gibbous",  illumination };
  if (phase < 23.99) return { emoji: "🌗", name: "Last Quarter",    illumination };
  return                    { emoji: "🌘", name: "Waning Crescent", illumination };
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatEntryDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function monthKey(iso: string): string { return iso.slice(0, 7); }

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// ─── Emotion Symbols ──────────────────────────────────────────────────────────

const EMOTIONS = [
  { emoji: "🌙", label: "Peaceful" },
  { emoji: "💫", label: "Mystical" },
  { emoji: "☀️", label: "Joyful" },
  { emoji: "🌊", label: "Overwhelmed" },
  { emoji: "🌀", label: "Confused" },
  { emoji: "💧", label: "Sad" },
  { emoji: "⚡", label: "Energised" },
  { emoji: "🌸", label: "Nostalgic" },
  { emoji: "🔥", label: "Passionate" },
  { emoji: "🌑", label: "Fearful" },
] as const;

type EmotionLabel = (typeof EMOTIONS)[number]["label"];

function emotionEmoji(label: string): string {
  return EMOTIONS.find((e) => e.label === label)?.emoji ?? "✨";
}

// ─── Blank draft ──────────────────────────────────────────────────────────────

type Draft = {
  date: string;
  description: string;
  dreamEmotions: EmotionLabel[];
  wakingEmotions: EmotionLabel[];
};

function blankDraft(): Draft {
  return { date: todayISO(), description: "", dreamEmotions: [], wakingEmotions: [] };
}

// ─── Component ────────────────────────────────────────────────────────────────

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export default function DreamJournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, isAnonymous } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [entries, setEntries] = useState<FSDreamEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"entries" | "insights">("entries");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<"describe" | "tag" | "analysis">("describe");
  const [draft, setDraft] = useState<Draft>(blankDraft());
  const [saving, setSaving] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [aiResult, setAiResult] = useState<FSDreamEntry["aiAnalysis"] | null>(null);

  // Entry detail
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Monthly insight generation
  const [insightLoading, setInsightLoading] = useState(false);
  const [monthlyInsights, setMonthlyInsights] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userId || isAnonymous) return;
    return subscribeDreamEntries(userId, setEntries);
  }, [userId, isAnonymous]);

  const moon = useMemo(() => getMoonPhase(draft.date), [draft.date]);

  // Group entries by month
  const byMonth = useMemo(() => {
    const map: Record<string, FSDreamEntry[]> = {};
    entries.forEach((e) => {
      const k = monthKey(e.date);
      if (!map[k]) map[k] = [];
      map[k].push(e);
    });
    return map;
  }, [entries]);

  const monthKeys = useMemo(() => Object.keys(byMonth).sort().reverse(), [byMonth]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openModal() {
    setDraft(blankDraft());
    setAiResult(null);
    setModalStep("describe");
    setShowModal(true);
  }

  function toggleDreamEmotion(label: EmotionLabel) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft((d) => ({
      ...d,
      dreamEmotions: d.dreamEmotions.includes(label)
        ? d.dreamEmotions.filter((e) => e !== label)
        : [...d.dreamEmotions, label],
    }));
  }

  function toggleWakingEmotion(label: EmotionLabel) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft((d) => ({
      ...d,
      wakingEmotions: d.wakingEmotions.includes(label)
        ? d.wakingEmotions.filter((e) => e !== label)
        : [...d.wakingEmotions, label],
    }));
  }

  async function handleAnalyse() {
    if (!draft.description.trim()) return;
    setAnalysing(true);
    try {
      const resp = await fetch(`${API_URL}/api/ai/analyze-dream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dream: draft.description,
          dreamEmotions: draft.dreamEmotions,
          wakingEmotions: draft.wakingEmotions,
          moonPhase: moon.name,
        }),
      });
      if (!resp.ok) throw new Error("Analysis failed");
      const data = await resp.json();
      setAiResult(data);
      setModalStep("analysis");
    } catch {
      Alert.alert("Analysis unavailable", "AI analysis will be available once set up. You can still save your dream.");
      setModalStep("analysis");
    } finally {
      setAnalysing(false);
    }
  }

  async function handleSave() {
    if (!draft.description.trim() || !userId) return;
    setSaving(true);
    try {
      await addDreamEntry(userId, {
        date: draft.date,
        description: draft.description,
        dreamEmotions: draft.dreamEmotions,
        wakingEmotions: draft.wakingEmotions,
        moonPhase: moon.name,
        moonEmoji: moon.emoji,
        moonIllumination: moon.illumination,
        aiAnalysis: aiResult ?? undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowModal(false);
    } catch {
      Alert.alert("Error", "Could not save dream entry. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: FSDreamEntry) {
    if (!userId) return;
    Alert.alert("Delete Dream", "Remove this dream entry permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteDreamEntry(userId, entry.id);
        },
      },
    ]);
  }

  async function handleMonthlyInsight(monthK: string) {
    const monthEntries = byMonth[monthK];
    if (!monthEntries || monthEntries.length < 3) {
      Alert.alert("Not enough entries", "Add at least 3 dream entries in this month to generate insights.");
      return;
    }
    setInsightLoading(true);
    try {
      const resp = await fetch(`${API_URL}/api/ai/monthly-dream-insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: monthK,
          entries: monthEntries.map((e) => ({
            date: e.date,
            moonPhase: e.moonPhase,
            dreamEmotions: e.dreamEmotions,
            wakingEmotions: e.wakingEmotions,
            description: e.description,
            symbols: e.aiAnalysis?.symbols ?? [],
            themes: e.aiAnalysis?.themes ?? [],
          })),
        }),
      });
      if (!resp.ok) throw new Error("Could not generate insights");
      const data = await resp.json();
      setMonthlyInsights((prev) => ({ ...prev, [monthK]: data.insight }));
    } catch {
      Alert.alert("Insight unavailable", "AI insights require account verification. Check back soon.");
    } finally {
      setInsightLoading(false);
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  function EmotionPill({ label, dim }: { label: string; dim?: boolean }) {
    return (
      <View style={[s.pill, { backgroundColor: dim ? `${colors.deepIndigo}12` : `${colors.deepIndigo}18` }]}>
        <Text style={s.pillEmoji}>{emotionEmoji(label)}</Text>
        <Text style={[s.pillText, { color: colors.deepIndigo, opacity: dim ? 0.6 : 1 }]}>{label}</Text>
      </View>
    );
  }

  function MoonBadge({ phase, emoji, illumination }: { phase: string; emoji: string; illumination: number }) {
    return (
      <View style={s.moonBadge}>
        <Text style={s.moonBadgeEmoji}>{emoji}</Text>
        <View>
          <Text style={[s.moonBadgeName, { color: colors.charcoal }]}>{phase}</Text>
          <Text style={[s.moonBadgeSub, { color: colors.sage }]}>{illumination}% illuminated</Text>
        </View>
      </View>
    );
  }

  // ── Entry Card ─────────────────────────────────────────────────────────────

  function EntryCard({ entry }: { entry: FSDreamEntry }) {
    const expanded = expandedId === entry.id;
    const moon = getMoonPhase(entry.date);
    return (
      <TouchableOpacity
        style={[s.entryCard, { backgroundColor: colors.card, borderColor: colors.cream }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedId(expanded ? null : entry.id); }}
        activeOpacity={0.88}
      >
        {/* Moon phase overlay */}
        <LinearGradient
          colors={["#2D1B6908", "transparent"]}
          style={s.entryMoonGrad}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={s.entryTop}>
          <View style={{ flex: 1 }}>
            <Text style={[s.entryDate, { color: colors.sage }]}>{formatEntryDate(entry.date)}</Text>
            <Text style={[s.entryPreview, { color: colors.charcoal }]} numberOfLines={expanded ? undefined : 2}>
              {entry.description}
            </Text>
          </View>
          <View style={s.entryMoonCol}>
            <Text style={s.entryMoonEmoji}>{entry.moonEmoji}</Text>
            <Text style={[s.entryMoonName, { color: colors.sage }]}>{entry.moonPhase}</Text>
          </View>
        </View>

        {/* Emotion rows */}
        <View style={s.entryEmotionBlock}>
          <Text style={[s.emotionRowLabel, { color: colors.sage }]}>In dream</Text>
          <View style={s.pillRow}>
            {entry.dreamEmotions.length === 0
              ? <Text style={[s.emptyPillText, { color: colors.sage }]}>—</Text>
              : entry.dreamEmotions.map((l) => <EmotionPill key={l} label={l} />)}
          </View>
          <Text style={[s.emotionRowLabel, { color: colors.sage, marginTop: 6 }]}>On waking</Text>
          <View style={s.pillRow}>
            {entry.wakingEmotions.length === 0
              ? <Text style={[s.emptyPillText, { color: colors.sage }]}>—</Text>
              : entry.wakingEmotions.map((l) => <EmotionPill key={l} label={l} />)}
          </View>
        </View>

        {/* AI analysis (expanded) */}
        {expanded && entry.aiAnalysis && (
          <View style={[s.analysisBox, { backgroundColor: `${colors.deepIndigo}08`, borderColor: `${colors.deepIndigo}18` }]}>
            <Text style={[s.analysisTitle, { color: colors.deepIndigo }]}>✦ Dream Analysis</Text>
            {entry.aiAnalysis.symbols.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={[s.analysisSectionLabel, { color: colors.warmGold }]}>SYMBOLS</Text>
                <View style={s.pillRow}>
                  {entry.aiAnalysis.symbols.map((sym) => (
                    <View key={sym} style={[s.pill, { backgroundColor: `${colors.warmGold}18` }]}>
                      <Text style={[s.pillText, { color: colors.warmGold }]}>{sym}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {entry.aiAnalysis.themes.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={[s.analysisSectionLabel, { color: colors.warmGold }]}>THEMES</Text>
                <View style={s.pillRow}>
                  {entry.aiAnalysis.themes.map((t) => (
                    <View key={t} style={[s.pill, { backgroundColor: `${colors.deepIndigo}12` }]}>
                      <Text style={[s.pillText, { color: colors.deepIndigo }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <Text style={[s.analysisMessage, { color: colors.charcoal }]}>{entry.aiAnalysis.message}</Text>
          </View>
        )}

        <View style={s.entryFooter}>
          {!entry.aiAnalysis && (
            <Text style={[s.noAnalysisText, { color: colors.sage }]}>No AI analysis · tap to expand</Text>
          )}
          <TouchableOpacity onPress={() => handleDelete(entry)} hitSlop={8}>
            <Feather name="trash-2" size={14} color={colors.sage} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Insights Tab ───────────────────────────────────────────────────────────

  function InsightsTab() {
    if (entries.length < 3) {
      return (
        <View style={s.emptyState}>
          <Text style={s.emptyMoon}>🌙</Text>
          <Text style={[s.emptyTitle, { color: colors.charcoal }]}>Keep dreaming</Text>
          <Text style={[s.emptySub, { color: colors.sage }]}>Add 3 or more dream entries to unlock pattern insights across symbols, emotions, and moon phases.</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 80 }}>
        {monthKeys.map((mk) => {
          const mes = byMonth[mk];
          if (!mes || mes.length === 0) return null;

          // Aggregate emotions
          const dreamEmCount: Record<string, number> = {};
          const wakingEmCount: Record<string, number> = {};
          const moonCount: Record<string, number> = {};
          const allSymbols: string[] = [];

          mes.forEach((e) => {
            e.dreamEmotions.forEach((em) => { dreamEmCount[em] = (dreamEmCount[em] ?? 0) + 1; });
            e.wakingEmotions.forEach((em) => { wakingEmCount[em] = (wakingEmCount[em] ?? 0) + 1; });
            moonCount[e.moonPhase] = (moonCount[e.moonPhase] ?? 0) + 1;
            e.aiAnalysis?.symbols.forEach((sym) => allSymbols.push(sym));
          });

          const topDream = Object.entries(dreamEmCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
          const topWaking = Object.entries(wakingEmCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
          const topMoons = Object.entries(moonCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
          const symbolFreq: Record<string, number> = {};
          allSymbols.forEach((s) => { symbolFreq[s] = (symbolFreq[s] ?? 0) + 1; });
          const topSymbols = Object.entries(symbolFreq).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 5);
          const hasInsight = !!monthlyInsights[mk];

          return (
            <View key={mk} style={[s.insightCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
              <LinearGradient colors={["#2D1B6910", "transparent"]} style={s.insightGrad} />
              <Text style={[s.insightMonth, { color: colors.charcoal }]}>{monthLabel(mk)}</Text>
              <Text style={[s.insightCount, { color: colors.sage }]}>{mes.length} dream{mes.length > 1 ? "s" : ""} recorded</Text>

              <View style={s.insightRow}>
                <View style={s.insightHalf}>
                  <Text style={[s.insightLabel, { color: colors.warmGold }]}>IN DREAM</Text>
                  {topDream.map(([em, count]) => (
                    <View key={em} style={s.insightEmRow}>
                      <Text style={s.insightEmEmoji}>{emotionEmoji(em)}</Text>
                      <Text style={[s.insightEmLabel, { color: colors.charcoal }]}>{em}</Text>
                      <Text style={[s.insightEmCount, { color: colors.sage }]}>×{count}</Text>
                    </View>
                  ))}
                </View>
                <View style={[s.insightDivider, { backgroundColor: colors.cream }]} />
                <View style={s.insightHalf}>
                  <Text style={[s.insightLabel, { color: colors.warmGold }]}>ON WAKING</Text>
                  {topWaking.map(([em, count]) => (
                    <View key={em} style={s.insightEmRow}>
                      <Text style={s.insightEmEmoji}>{emotionEmoji(em)}</Text>
                      <Text style={[s.insightEmLabel, { color: colors.charcoal }]}>{em}</Text>
                      <Text style={[s.insightEmCount, { color: colors.sage }]}>×{count}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {topMoons.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[s.insightLabel, { color: colors.warmGold }]}>MOON PHASES</Text>
                  <View style={s.pillRow}>
                    {topMoons.map(([phase, count]) => {
                      const mp = getMoonPhase(mes.find((e) => e.moonPhase === phase)?.date ?? mes[0].date);
                      return (
                        <View key={phase} style={[s.pill, { backgroundColor: `${colors.deepIndigo}12` }]}>
                          <Text style={s.pillEmoji}>{mp.emoji}</Text>
                          <Text style={[s.pillText, { color: colors.deepIndigo }]}>{phase} ×{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {topSymbols.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[s.insightLabel, { color: colors.warmGold }]}>RECURRING SYMBOLS</Text>
                  <View style={s.pillRow}>
                    {topSymbols.map(([sym, count]) => (
                      <View key={sym} style={[s.pill, { backgroundColor: `${colors.warmGold}18` }]}>
                        <Text style={[s.pillText, { color: colors.warmGold }]}>{sym} ×{count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {hasInsight ? (
                <View style={[s.analysisBox, { marginTop: 14, backgroundColor: `${colors.deepIndigo}08`, borderColor: `${colors.deepIndigo}18` }]}>
                  <Text style={[s.analysisTitle, { color: colors.deepIndigo }]}>✦ Monthly Reflection</Text>
                  <Text style={[s.analysisMessage, { color: colors.charcoal }]}>{monthlyInsights[mk]}</Text>
                </View>
              ) : mes.length >= 3 ? (
                <TouchableOpacity
                  style={[s.insightBtn, { backgroundColor: `${colors.deepIndigo}10`, borderColor: `${colors.deepIndigo}30` }]}
                  onPress={() => handleMonthlyInsight(mk)}
                  disabled={insightLoading}
                  activeOpacity={0.8}
                >
                  {insightLoading
                    ? <ActivityIndicator size="small" color={colors.deepIndigo} />
                    : <Text style={[s.insightBtnText, { color: colors.deepIndigo }]}>✦ Generate Monthly Reflection</Text>}
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    );
  }

  // ── Modal ──────────────────────────────────────────────────────────────────

  function EmotionGrid({
    title,
    selected,
    onToggle,
  }: {
    title: string;
    selected: EmotionLabel[];
    onToggle: (l: EmotionLabel) => void;
  }) {
    return (
      <View style={{ marginBottom: 20 }}>
        <Text style={[s.emotionGridTitle, { color: colors.charcoal }]}>{title}</Text>
        <View style={s.emotionGrid}>
          {EMOTIONS.map((em) => {
            const active = selected.includes(em.label);
            return (
              <TouchableOpacity
                key={em.label}
                style={[
                  s.emotionChip,
                  {
                    backgroundColor: active ? colors.deepIndigo : `${colors.deepIndigo}08`,
                    borderColor: active ? colors.deepIndigo : `${colors.deepIndigo}20`,
                  },
                ]}
                onPress={() => onToggle(em.label)}
                activeOpacity={0.8}
              >
                <Text style={s.emotionChipEmoji}>{em.emoji}</Text>
                <Text style={[s.emotionChipLabel, { color: active ? "#fff" : colors.charcoal }]}>{em.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.softWhite }]}>
      {/* Header */}
      <LinearGradient colors={[colors.deepIndigo, "#4A2C8A"]} style={[s.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={s.headerTitle}>Dream Journal</Text>
          <Text style={s.headerSub}>{entries.length} {entries.length === 1 ? "entry" : "entries"}</Text>
        </View>
        <TouchableOpacity onPress={openModal} style={s.addBtn} hitSlop={8}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Tabs */}
      <View style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.cream }]}>
        {(["entries", "insights"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && { borderBottomColor: colors.deepIndigo }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab); }}
          >
            <Text style={[s.tabText, { color: activeTab === tab ? colors.deepIndigo : colors.sage }]}>
              {tab === "entries" ? "Journal" : "Insights"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === "entries" ? (
        entries.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyMoon}>🌙</Text>
            <Text style={[s.emptyTitle, { color: colors.charcoal }]}>Your dream space awaits</Text>
            <Text style={[s.emptySub, { color: colors.sage }]}>Record your first dream to begin tracking symbols, emotions and moon phases.</Text>
            <TouchableOpacity style={[s.emptyBtn, { backgroundColor: colors.deepIndigo }]} onPress={openModal}>
              <Text style={s.emptyBtnText}>Record First Dream</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}>
            {entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
          </ScrollView>
        )
      ) : (
        <InsightsTab />
      )}

      {/* New Entry FAB */}
      {activeTab === "entries" && entries.length > 0 && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.deepIndigo, bottom: insets.bottom + 24 }]}
          onPress={openModal}
          activeOpacity={0.88}
        >
          <Feather name="moon" size={20} color="#fff" />
          <Text style={s.fabText}>New Dream</Text>
        </TouchableOpacity>
      )}

      {/* Entry Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <LinearGradient colors={[colors.deepIndigo, "#4A2C8A"]} style={[s.modalHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={12}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>
              {modalStep === "describe" ? "Describe Your Dream" : modalStep === "tag" ? "Tag Emotions" : "Dream Analysis"}
            </Text>
            <MoonBadge phase={moon.name} emoji={moon.emoji} illumination={moon.illumination} />
          </LinearGradient>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {modalStep === "describe" && (
              <>
                {/* Date */}
                <Text style={[s.fieldLabel, { color: colors.charcoal }]}>Date</Text>
                <TextInput
                  style={[s.dateInput, { backgroundColor: colors.card, borderColor: colors.cream, color: colors.charcoal }]}
                  value={draft.date}
                  onChangeText={(t) => setDraft((d) => ({ ...d, date: t }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.sage}
                />

                {/* Moon phase display */}
                <View style={[s.moonDisplay, { backgroundColor: `${colors.deepIndigo}08`, borderColor: `${colors.deepIndigo}18` }]}>
                  <Text style={s.moonDisplayEmoji}>{moon.emoji}</Text>
                  <View>
                    <Text style={[s.moonDisplayName, { color: colors.deepIndigo }]}>{moon.name}</Text>
                    <Text style={[s.moonDisplaySub, { color: colors.sage }]}>{moon.illumination}% illuminated on this night</Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={[s.fieldLabel, { color: colors.charcoal }]}>Your dream</Text>
                <TextInput
                  style={[s.descInput, { backgroundColor: colors.card, borderColor: colors.cream, color: colors.charcoal }]}
                  value={draft.description}
                  onChangeText={(t) => setDraft((d) => ({ ...d, description: t }))}
                  placeholder="Describe everything you remember — scenes, people, feelings, colours…"
                  placeholderTextColor={colors.sage}
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[s.nextBtn, { backgroundColor: draft.description.trim() ? colors.deepIndigo : `${colors.deepIndigo}40` }]}
                  onPress={() => { if (draft.description.trim()) setModalStep("tag"); }}
                  disabled={!draft.description.trim()}
                >
                  <Text style={s.nextBtnText}>Tag Emotions</Text>
                  <Feather name="arrow-right" size={16} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            {modalStep === "tag" && (
              <>
                <EmotionGrid
                  title="How did you feel inside the dream?"
                  selected={draft.dreamEmotions}
                  onToggle={toggleDreamEmotion}
                />
                <EmotionGrid
                  title="How did you feel when you woke up?"
                  selected={draft.wakingEmotions}
                  onToggle={toggleWakingEmotion}
                />

                <View style={s.rowBtns}>
                  <TouchableOpacity style={[s.backStepBtn, { borderColor: colors.cream }]} onPress={() => setModalStep("describe")}>
                    <Feather name="arrow-left" size={16} color={colors.charcoal} />
                    <Text style={[s.backStepText, { color: colors.charcoal }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.analyseBtn, { backgroundColor: `${colors.deepIndigo}12`, borderColor: `${colors.deepIndigo}30` }, analysing && { opacity: 0.6 }]}
                    onPress={handleAnalyse}
                    disabled={analysing}
                  >
                    {analysing
                      ? <ActivityIndicator size="small" color={colors.deepIndigo} />
                      : <>
                        <Text style={[s.analyseBtnText, { color: colors.deepIndigo }]}>✦ Analyse Dream</Text>
                      </>}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[s.skipBtn]} onPress={() => setModalStep("analysis")}>
                  <Text style={[s.skipBtnText, { color: colors.sage }]}>Skip analysis · save as-is</Text>
                </TouchableOpacity>
              </>
            )}

            {modalStep === "analysis" && (
              <>
                {aiResult ? (
                  <View style={[s.analysisBox, { backgroundColor: `${colors.deepIndigo}08`, borderColor: `${colors.deepIndigo}20` }]}>
                    <Text style={[s.analysisTitle, { color: colors.deepIndigo }]}>✦ Dream Analysis</Text>
                    {aiResult.symbols.length > 0 && (
                      <>
                        <Text style={[s.analysisSectionLabel, { color: colors.warmGold, marginTop: 10 }]}>SYMBOLS FOUND</Text>
                        <View style={s.pillRow}>
                          {aiResult.symbols.map((sym) => (
                            <View key={sym} style={[s.pill, { backgroundColor: `${colors.warmGold}18` }]}>
                              <Text style={[s.pillText, { color: colors.warmGold }]}>{sym}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                    {aiResult.themes.length > 0 && (
                      <>
                        <Text style={[s.analysisSectionLabel, { color: colors.warmGold, marginTop: 10 }]}>THEMES</Text>
                        <View style={s.pillRow}>
                          {aiResult.themes.map((t) => (
                            <View key={t} style={[s.pill, { backgroundColor: `${colors.deepIndigo}12` }]}>
                              <Text style={[s.pillText, { color: colors.deepIndigo }]}>{t}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                    <Text style={[s.analysisMessage, { color: colors.charcoal }]}>{aiResult.message}</Text>
                  </View>
                ) : (
                  <View style={[s.analysisBox, { backgroundColor: `${colors.deepIndigo}06`, borderColor: `${colors.deepIndigo}15` }]}>
                    <Text style={[s.analysisTitle, { color: colors.deepIndigo }]}>No analysis generated</Text>
                    <Text style={[s.analysisMessage, { color: colors.sage }]}>Your dream will be saved without AI analysis. You can analyse past entries once AI is set up.</Text>
                  </View>
                )}

                <View style={s.rowBtns}>
                  <TouchableOpacity style={[s.backStepBtn, { borderColor: colors.cream }]} onPress={() => setModalStep("tag")}>
                    <Feather name="arrow-left" size={16} color={colors.charcoal} />
                    <Text style={[s.backStepText, { color: colors.charcoal }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.saveBtn, { backgroundColor: colors.deepIndigo }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                        <Feather name="moon" size={14} color="#fff" />
                        <Text style={s.saveBtnText}>Save Dream</Text>
                      </>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 36 },
  addBtn: { width: 36, alignItems: "flex-end" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff", letterSpacing: 0.2 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 1 },

  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 14, fontWeight: "600" },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyMoon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 24 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 24 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  entryCard: { borderRadius: 16, borderWidth: 1, marginBottom: 14, overflow: "hidden" },
  entryMoonGrad: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  entryTop: { flexDirection: "row", padding: 16, gap: 12 },
  entryDate: { fontSize: 11, fontWeight: "600", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  entryPreview: { fontSize: 14, lineHeight: 21 },
  entryMoonCol: { alignItems: "center", minWidth: 60 },
  entryMoonEmoji: { fontSize: 28 },
  entryMoonName: { fontSize: 10, textAlign: "center", marginTop: 2 },

  entryEmotionBlock: { paddingHorizontal: 16, paddingBottom: 12 },
  emotionRowLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
  pillEmoji: { fontSize: 12 },
  pillText: { fontSize: 11, fontWeight: "500" },
  emptyPillText: { fontSize: 12 },

  analysisBox: { margin: 12, marginTop: 0, borderRadius: 12, borderWidth: 1, padding: 14 },
  analysisTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  analysisSectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 6 },
  analysisMessage: { fontSize: 13, lineHeight: 20, marginTop: 10 },

  entryFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12 },
  noAnalysisText: { fontSize: 11 },

  fab: { position: "absolute", right: 20, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Insights
  insightCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 16, overflow: "hidden" },
  insightGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 80 },
  insightMonth: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  insightCount: { fontSize: 12, marginBottom: 14 },
  insightRow: { flexDirection: "row", gap: 12 },
  insightHalf: { flex: 1 },
  insightDivider: { width: 1 },
  insightLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8 },
  insightEmRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  insightEmEmoji: { fontSize: 14 },
  insightEmLabel: { fontSize: 12, flex: 1 },
  insightEmCount: { fontSize: 11 },
  insightBtn: { marginTop: 14, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: "center" },
  insightBtnText: { fontSize: 13, fontWeight: "600" },

  // Modal
  modalHeader: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  moonBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  moonBadgeEmoji: { fontSize: 20 },
  moonBadgeName: { fontSize: 11, fontWeight: "600" },
  moonBadgeSub: { fontSize: 10 },

  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 4 },
  dateInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 14 },
  moonDisplay: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 18 },
  moonDisplayEmoji: { fontSize: 32 },
  moonDisplayName: { fontSize: 14, fontWeight: "700" },
  moonDisplaySub: { fontSize: 12, marginTop: 2 },
  descInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 140, marginBottom: 20 },

  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, padding: 15 },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  emotionGridTitle: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  emotionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  emotionChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  emotionChipEmoji: { fontSize: 15 },
  emotionChipLabel: { fontSize: 12, fontWeight: "500" },

  rowBtns: { flexDirection: "row", gap: 10, marginBottom: 12 },
  backStepBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backStepText: { fontSize: 14, fontWeight: "600" },
  analyseBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 12 },
  analyseBtnText: { fontSize: 14, fontWeight: "700" },
  skipBtn: { alignItems: "center", paddingVertical: 10 },
  skipBtnText: { fontSize: 13 },
  saveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 12 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
