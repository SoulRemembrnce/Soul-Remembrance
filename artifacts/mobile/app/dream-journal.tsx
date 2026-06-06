import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
  addDreamEntry,
  deleteDreamEntry,
  FSDreamEntry,
  subscribeDreamEntries,
} from "@/lib/firestore";

// ─── Moon Phase ───────────────────────────────────────────────────────────────

const KNOWN_NEW_MOON = new Date("2000-01-06T18:14:00Z").getTime();
const SYNODIC_PERIOD = 29.530589;

function getMoonPhase(dateStr: string): { emoji: string; name: string; illumination: number } {
  const date = new Date(dateStr + "T12:00:00");
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

// ─── Emotions ─────────────────────────────────────────────────────────────────

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

// ─── Draft ────────────────────────────────────────────────────────────────────

type Draft = {
  date: string;
  description: string;
  dreamEmotions: EmotionLabel[];
  wakingEmotions: EmotionLabel[];
  reflection: string;
};

function blankDraft(): Draft {
  return { date: todayISO(), description: "", dreamEmotions: [], wakingEmotions: [], reflection: "" };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DreamJournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, isAnonymous } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [entries, setEntries] = useState<FSDreamEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"entries" | "insights">("entries");

  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<"describe" | "tag" | "reflect">("describe");
  const [draft, setDraft] = useState<Draft>(blankDraft());
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || isAnonymous) return;
    return subscribeDreamEntries(userId, setEntries);
  }, [userId, isAnonymous]);

  const moon = useMemo(() => getMoonPhase(draft.date), [draft.date]);

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
    setModalStep("describe");
    setShowModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  async function handleSave() {
    if (!draft.description.trim() || !userId) return;
    setSaving(true);
    try {
      await addDreamEntry(userId, {
        date: draft.date,
        description: draft.description,
        dreamEmotions: draft.dreamEmotions,
        wakingEmotions: draft.wakingEmotions,
        reflection: draft.reflection,
        moonPhase: moon.name,
        moonEmoji: moon.emoji,
        moonIllumination: moon.illumination,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowModal(false);
    } catch {
      Alert.alert("Error", "Could not save your dream. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: FSDreamEntry) {
    if (!userId) return;
    Alert.alert("Delete Dream", "Remove this dream entry permanently?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteDreamEntry(userId, entry.id) },
    ]);
  }

  // ── Sub-components ─────────────────────────────────────────────────────────

  function EmotionPill({ label }: { label: string }) {
    return (
      <View style={[s.pill, { backgroundColor: `${colors.deepIndigo}15` }]}>
        <Text style={s.pillEmoji}>{emotionEmoji(label)}</Text>
        <Text style={[s.pillText, { color: colors.deepIndigo }]}>{label}</Text>
      </View>
    );
  }

  function EmotionGrid({ title, selected, onToggle }: {
    title: string;
    selected: EmotionLabel[];
    onToggle: (l: EmotionLabel) => void;
  }) {
    return (
      <View style={{ marginBottom: 24 }}>
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
                <Text style={[s.emotionChipLabel, { color: active ? "#fff" : colors.charcoal }]}>
                  {em.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // ── Entry Card ─────────────────────────────────────────────────────────────

  function EntryCard({ entry }: { entry: FSDreamEntry }) {
    const expanded = expandedId === entry.id;
    return (
      <TouchableOpacity
        style={[s.entryCard, { backgroundColor: colors.card, borderColor: colors.cream }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpandedId(expanded ? null : entry.id); }}
        activeOpacity={0.88}
      >
        {/* Subtle night-sky tint */}
        <LinearGradient
          colors={["#2D1B6909", "transparent"]}
          style={s.entryGrad}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Top row: date + moon */}
        <View style={s.entryTop}>
          <View style={{ flex: 1 }}>
            <Text style={[s.entryDate, { color: colors.sage }]}>{formatEntryDate(entry.date)}</Text>
            <Text style={[s.entryPreview, { color: colors.charcoal }]} numberOfLines={expanded ? undefined : 2}>
              {entry.description}
            </Text>
          </View>
          <View style={s.moonCol}>
            <Text style={s.moonEmoji}>{entry.moonEmoji}</Text>
            <Text style={[s.moonName, { color: colors.sage }]}>{entry.moonPhase}</Text>
            <Text style={[s.moonIllum, { color: colors.sage }]}>{entry.moonIllumination}%</Text>
          </View>
        </View>

        {/* Emotion rows */}
        <View style={s.emotionBlock}>
          <View style={s.emotionRow}>
            <Text style={[s.emotionRowLabel, { color: colors.sage }]}>In dream</Text>
            <View style={s.pillRow}>
              {entry.dreamEmotions.length === 0
                ? <Text style={[s.dash, { color: colors.sage }]}>—</Text>
                : entry.dreamEmotions.map((l) => <EmotionPill key={l} label={l} />)}
            </View>
          </View>
          <View style={[s.emotionRow, { marginTop: 8 }]}>
            <Text style={[s.emotionRowLabel, { color: colors.sage }]}>On waking</Text>
            <View style={s.pillRow}>
              {entry.wakingEmotions.length === 0
                ? <Text style={[s.dash, { color: colors.sage }]}>—</Text>
                : entry.wakingEmotions.map((l) => <EmotionPill key={l} label={l} />)}
            </View>
          </View>
        </View>

        {/* Personal reflection (expanded) */}
        {expanded && entry.reflection ? (
          <View style={[s.reflectionBox, { backgroundColor: `${colors.deepIndigo}07`, borderColor: `${colors.deepIndigo}15` }]}>
            <Text style={[s.reflectionLabel, { color: colors.warmGold }]}>MY REFLECTION</Text>
            <Text style={[s.reflectionText, { color: colors.charcoal }]}>{entry.reflection}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={s.entryFooter}>
          <Text style={[s.expandHint, { color: colors.sage }]}>
            {expanded ? "Tap to collapse" : entry.reflection ? "Tap to read reflection" : "Tap to expand"}
          </Text>
          <TouchableOpacity onPress={() => handleDelete(entry)} hitSlop={10}>
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
          <Text style={[s.emptySub, { color: colors.sage }]}>
            Add 3 or more dreams to reveal patterns in your emotions, moon phases and recurring feelings.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 80 }}>
        {monthKeys.map((mk) => {
          const mes = byMonth[mk];
          if (!mes || mes.length === 0) return null;

          const dreamCount: Record<string, number> = {};
          const wakingCount: Record<string, number> = {};
          const moonCount: Record<string, number> = {};

          mes.forEach((e) => {
            e.dreamEmotions.forEach((em) => { dreamCount[em] = (dreamCount[em] ?? 0) + 1; });
            e.wakingEmotions.forEach((em) => { wakingCount[em] = (wakingCount[em] ?? 0) + 1; });
            moonCount[e.moonPhase] = (moonCount[e.moonPhase] ?? 0) + 1;
          });

          const topDream  = Object.entries(dreamCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
          const topWaking = Object.entries(wakingCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
          const topMoons  = Object.entries(moonCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

          return (
            <View key={mk} style={[s.insightCard, { backgroundColor: colors.card, borderColor: colors.cream }]}>
              <LinearGradient colors={["#2D1B6910", "transparent"]} style={s.insightGrad} />
              <Text style={[s.insightMonth, { color: colors.charcoal }]}>{monthLabel(mk)}</Text>
              <Text style={[s.insightCount, { color: colors.sage }]}>
                {mes.length} dream{mes.length !== 1 ? "s" : ""} recorded
              </Text>

              <View style={s.insightColumns}>
                {/* Dream emotions */}
                <View style={s.insightCol}>
                  <Text style={[s.insightColLabel, { color: colors.warmGold }]}>IN DREAM</Text>
                  {topDream.length === 0
                    ? <Text style={[s.dash, { color: colors.sage }]}>—</Text>
                    : topDream.map(([em, count]) => (
                      <View key={em} style={s.insightEmRow}>
                        <Text style={s.insightEmEmoji}>{emotionEmoji(em)}</Text>
                        <Text style={[s.insightEmLabel, { color: colors.charcoal }]}>{em}</Text>
                        <Text style={[s.insightEmCount, { color: colors.sage }]}>×{count}</Text>
                      </View>
                    ))}
                </View>

                <View style={[s.insightDivider, { backgroundColor: colors.cream }]} />

                {/* Waking emotions */}
                <View style={s.insightCol}>
                  <Text style={[s.insightColLabel, { color: colors.warmGold }]}>ON WAKING</Text>
                  {topWaking.length === 0
                    ? <Text style={[s.dash, { color: colors.sage }]}>—</Text>
                    : topWaking.map(([em, count]) => (
                      <View key={em} style={s.insightEmRow}>
                        <Text style={s.insightEmEmoji}>{emotionEmoji(em)}</Text>
                        <Text style={[s.insightEmLabel, { color: colors.charcoal }]}>{em}</Text>
                        <Text style={[s.insightEmCount, { color: colors.sage }]}>×{count}</Text>
                      </View>
                    ))}
                </View>
              </View>

              {/* Moon phases */}
              {topMoons.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[s.insightColLabel, { color: colors.warmGold }]}>MOON PHASES</Text>
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

              {/* Shift note */}
              {topDream[0] && topWaking[0] && topDream[0][0] !== topWaking[0][0] && (
                <View style={[s.shiftNote, { backgroundColor: `${colors.deepIndigo}07`, borderColor: `${colors.deepIndigo}15` }]}>
                  <Text style={s.shiftNoteEmoji}>{emotionEmoji(topDream[0][0])} → {emotionEmoji(topWaking[0][0])}</Text>
                  <Text style={[s.shiftNoteText, { color: colors.charcoal }]}>
                    This month you often moved from{" "}
                    <Text style={{ fontStyle: "italic" }}>{topDream[0][0].toLowerCase()}</Text> in your dreams to{" "}
                    <Text style={{ fontStyle: "italic" }}>{topWaking[0][0].toLowerCase()}</Text> on waking.
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { backgroundColor: colors.softWhite }]}>

      {/* Header */}
      <LinearGradient
        colors={[colors.deepIndigo, "#4A2C8A"]}
        style={[s.header, { paddingTop: topPad + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.headerBack} hitSlop={12}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={s.headerTitle}>Dream Journal</Text>
          <Text style={s.headerSub}>{entries.length} {entries.length === 1 ? "entry" : "entries"}</Text>
        </View>
        <TouchableOpacity onPress={openModal} style={s.headerAdd} hitSlop={8}>
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
              {tab === "entries" ? "Journal" : "Patterns"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Body */}
      {activeTab === "entries" ? (
        entries.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyMoon}>🌙</Text>
            <Text style={[s.emptyTitle, { color: colors.charcoal }]}>Your dream space awaits</Text>
            <Text style={[s.emptySub, { color: colors.sage }]}>
              Record your first dream — the symbols, the feelings inside and the ones you wake with.
            </Text>
            <TouchableOpacity style={[s.emptyBtn, { backgroundColor: colors.deepIndigo }]} onPress={openModal}>
              <Text style={s.emptyBtnText}>Record First Dream</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}>
            {entries.map((e) => <EntryCard key={e.id} entry={e} />)}
          </ScrollView>
        )
      ) : (
        <InsightsTab />
      )}

      {/* FAB */}
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

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          {/* Modal header */}
          <LinearGradient
            colors={[colors.deepIndigo, "#4A2C8A"]}
            style={[s.modalHeader, { paddingTop: insets.top + 12 }]}
          >
            <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={12}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>
              {modalStep === "describe" ? "Describe Your Dream"
                : modalStep === "tag" ? "Tag Your Emotions"
                : "Your Reflection"}
            </Text>
            {/* Moon badge */}
            <View style={s.moonBadge}>
              <Text style={s.moonBadgeEmoji}>{moon.emoji}</Text>
              <View>
                <Text style={[s.moonBadgeName, { color: "rgba(255,255,255,0.9)" }]}>{moon.name}</Text>
                <Text style={[s.moonBadgeSub, { color: "rgba(255,255,255,0.6)" }]}>{moon.illumination}%</Text>
              </View>
            </View>
          </LinearGradient>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

            {/* Step 1 — Describe */}
            {modalStep === "describe" && (
              <>
                <Text style={[s.fieldLabel, { color: colors.charcoal }]}>Date</Text>
                <TextInput
                  style={[s.dateInput, { backgroundColor: colors.card, borderColor: colors.cream, color: colors.charcoal }]}
                  value={draft.date}
                  onChangeText={(t) => setDraft((d) => ({ ...d, date: t }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.sage}
                />

                {/* Moon phase card */}
                <View style={[s.moonCard, { backgroundColor: `${colors.deepIndigo}08`, borderColor: `${colors.deepIndigo}18` }]}>
                  <Text style={s.moonCardEmoji}>{moon.emoji}</Text>
                  <View>
                    <Text style={[s.moonCardName, { color: colors.deepIndigo }]}>{moon.name}</Text>
                    <Text style={[s.moonCardSub, { color: colors.sage }]}>{moon.illumination}% illuminated on this night</Text>
                  </View>
                </View>

                <Text style={[s.fieldLabel, { color: colors.charcoal }]}>Your dream</Text>
                <TextInput
                  style={[s.descInput, { backgroundColor: colors.card, borderColor: colors.cream, color: colors.charcoal }]}
                  value={draft.description}
                  onChangeText={(t) => setDraft((d) => ({ ...d, description: t }))}
                  placeholder="Describe everything you remember — scenes, people, symbols, colours, feelings…"
                  placeholderTextColor={colors.sage}
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: draft.description.trim() ? colors.deepIndigo : `${colors.deepIndigo}40` }]}
                  onPress={() => { if (draft.description.trim()) setModalStep("tag"); }}
                  disabled={!draft.description.trim()}
                >
                  <Text style={s.primaryBtnText}>Tag Emotions</Text>
                  <Feather name="arrow-right" size={16} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            {/* Step 2 — Emotions */}
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
                  <TouchableOpacity
                    style={[s.backBtn, { borderColor: colors.cream }]}
                    onPress={() => setModalStep("describe")}
                  >
                    <Feather name="arrow-left" size={16} color={colors.charcoal} />
                    <Text style={[s.backBtnText, { color: colors.charcoal }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.primaryBtn, { flex: 1, backgroundColor: colors.deepIndigo }]}
                    onPress={() => setModalStep("reflect")}
                  >
                    <Text style={s.primaryBtnText}>Your Reflection</Text>
                    <Feather name="arrow-right" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 3 — Personal Reflection */}
            {modalStep === "reflect" && (
              <>
                <Text style={[s.reflectPrompt, { color: colors.sage }]}>
                  The knowledge is within you. What do you feel this dream is showing you?
                </Text>
                <TextInput
                  style={[s.reflectInput, { backgroundColor: colors.card, borderColor: colors.cream, color: colors.charcoal }]}
                  value={draft.reflection}
                  onChangeText={(t) => setDraft((d) => ({ ...d, reflection: t }))}
                  placeholder="What symbols stood out? What might they mean for you? How does this connect to your waking life…"
                  placeholderTextColor={colors.sage}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />

                {/* Emotion shift reminder */}
                {draft.dreamEmotions.length > 0 && draft.wakingEmotions.length > 0 && (
                  <View style={[s.shiftNote, { backgroundColor: `${colors.deepIndigo}07`, borderColor: `${colors.deepIndigo}15` }]}>
                    <Text style={s.shiftNoteEmoji}>
                      {emotionEmoji(draft.dreamEmotions[0])} → {emotionEmoji(draft.wakingEmotions[0])}
                    </Text>
                    <Text style={[s.shiftNoteText, { color: colors.charcoal }]}>
                      You moved from{" "}
                      <Text style={{ fontStyle: "italic" }}>{draft.dreamEmotions[0].toLowerCase()}</Text>
                      {" "}in the dream to{" "}
                      <Text style={{ fontStyle: "italic" }}>{draft.wakingEmotions[0].toLowerCase()}</Text>
                      {" "}on waking.
                    </Text>
                  </View>
                )}

                <View style={[s.rowBtns, { marginTop: 8 }]}>
                  <TouchableOpacity
                    style={[s.backBtn, { borderColor: colors.cream }]}
                    onPress={() => setModalStep("tag")}
                  >
                    <Feather name="arrow-left" size={16} color={colors.charcoal} />
                    <Text style={[s.backBtnText, { color: colors.charcoal }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.primaryBtn, { flex: 1, backgroundColor: colors.deepIndigo, opacity: saving ? 0.6 : 1 }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    <Feather name="moon" size={14} color="#fff" />
                    <Text style={s.primaryBtnText}>Save Dream</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={s.skipBtn} onPress={() => { setDraft((d) => ({ ...d, reflection: "" })); handleSave(); }}>
                  <Text style={[s.skipBtnText, { color: colors.sage }]}>Save without reflection</Text>
                </TouchableOpacity>
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
  headerBack: { width: 36 },
  headerAdd: { width: 36, alignItems: "flex-end" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 1 },

  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 14, fontWeight: "600" },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyMoon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 24 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  entryCard: { borderRadius: 16, borderWidth: 1, marginBottom: 14, overflow: "hidden" },
  entryGrad: { position: "absolute", top: 0, right: 0, bottom: 0, width: 80 },
  entryTop: { flexDirection: "row", padding: 16, gap: 12 },
  entryDate: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  entryPreview: { fontSize: 14, lineHeight: 21 },
  moonCol: { alignItems: "center", minWidth: 58 },
  moonEmoji: { fontSize: 28 },
  moonName: { fontSize: 10, textAlign: "center", marginTop: 2 },
  moonIllum: { fontSize: 10, textAlign: "center" },

  emotionBlock: { paddingHorizontal: 16, paddingBottom: 12 },
  emotionRow: { gap: 6 },
  emotionRowLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  pill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, gap: 4 },
  pillEmoji: { fontSize: 12 },
  pillText: { fontSize: 11, fontWeight: "500" },
  dash: { fontSize: 13 },

  reflectionBox: { margin: 12, marginTop: 0, borderRadius: 12, borderWidth: 1, padding: 14 },
  reflectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8 },
  reflectionText: { fontSize: 13, lineHeight: 21 },

  entryFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12 },
  expandHint: { fontSize: 11 },

  fab: { position: "absolute", right: 20, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  insightCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 16, overflow: "hidden" },
  insightGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 80 },
  insightMonth: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  insightCount: { fontSize: 12, marginBottom: 14 },
  insightColumns: { flexDirection: "row", gap: 12 },
  insightCol: { flex: 1 },
  insightDivider: { width: 1 },
  insightColLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8 },
  insightEmRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  insightEmEmoji: { fontSize: 14 },
  insightEmLabel: { fontSize: 12, flex: 1 },
  insightEmCount: { fontSize: 11 },

  shiftNote: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 14, gap: 4 },
  shiftNoteEmoji: { fontSize: 18 },
  shiftNoteText: { fontSize: 13, lineHeight: 20 },

  modalHeader: { paddingHorizontal: 20, paddingBottom: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  moonBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  moonBadgeEmoji: { fontSize: 20 },
  moonBadgeName: { fontSize: 11, fontWeight: "600" },
  moonBadgeSub: { fontSize: 10 },

  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 4 },
  dateInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 14 },
  moonCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 18 },
  moonCardEmoji: { fontSize: 30 },
  moonCardName: { fontSize: 14, fontWeight: "700" },
  moonCardSub: { fontSize: 12, marginTop: 2 },
  descInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 130, marginBottom: 20 },

  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, padding: 15 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  emotionGridTitle: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  emotionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emotionChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  emotionChipEmoji: { fontSize: 15 },
  emotionChipLabel: { fontSize: 12, fontWeight: "500" },

  rowBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtnText: { fontSize: 14, fontWeight: "600" },

  reflectPrompt: { fontSize: 14, lineHeight: 22, marginBottom: 16, fontStyle: "italic" },
  reflectInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 160, marginBottom: 16 },

  skipBtn: { alignItems: "center", paddingVertical: 12 },
  skipBtnText: { fontSize: 13 },
});
