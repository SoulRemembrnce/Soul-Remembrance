import { Feather } from "@expo/vector-icons";
import { AshTreeBackground } from "@/components/AshTreeBackground";
import { LotusIcon } from "@/components/LotusIcon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
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
  AFFIRMATION_CATEGORIES,
  AFFIRMATIONS,
  Affirmation,
  getCategoryMeta,
  getDailyAffirmation,
} from "@/lib/affirmations-data";
import {
  FSCustomAffirmation,
  FSFavouriteAffirmation,
  addCustomAffirmation,
  addFavouriteAffirmation,
  deleteCustomAffirmation,
  removeFavouriteAffirmation,
  subscribeCustomAffirmations,
  subscribeFavouriteAffirmations,
} from "@/lib/firestore";

const CAT_COLORS: Record<string, string> = {
  "self-love": "#EC4899",
  "abundance":  "#C9A84C",
  "peace":      "#16A34A",
  "strength":   "#EA580C",
  "healing":    "#10B981",
  "spiritual":  "#6B4FA8",
};

type Tab = "today" | "explore" | "mine";

// ── Today Tab ─────────────────────────────────────────────────────────────────

function TodayTab({
  userId,
  isAnonymous,
  favourites,
}: {
  userId: string | null;
  isAnonymous: boolean;
  favourites: FSFavouriteAffirmation[];
}) {
  const colors = useColors();
  const [offset, setOffset] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const affirmation = useMemo(() => getDailyAffirmation(offset), [offset]);
  const meta = useMemo(() => getCategoryMeta(affirmation.category), [affirmation]);
  const catColor = CAT_COLORS[affirmation.category] ?? colors.purpleMid;

  const isFav = useMemo(
    () => favourites.some(f => f.affirmationId === affirmation.id),
    [favourites, affirmation]
  );
  const favDocId = useMemo(
    () => favourites.find(f => f.affirmationId === affirmation.id)?.id,
    [favourites, affirmation]
  );

  const handleNext = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setOffset(o => o + 1);
    Haptics.selectionAsync();
  }, [scaleAnim]);

  const handleFav = useCallback(async () => {
    if (!userId || isAnonymous) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isFav && favDocId) {
      await removeFavouriteAffirmation(userId, favDocId).catch(console.warn);
    } else {
      await addFavouriteAffirmation(userId, {
        text: affirmation.text,
        category: affirmation.category,
        affirmationId: affirmation.id,
      }).catch(console.warn);
    }
  }, [userId, isAnonymous, isFav, favDocId, affirmation]);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <Text style={[styles.todayDate, { color: colors.sage }]}>
        {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
      </Text>
      <Text style={[styles.todayHeading, { color: colors.deepIndigo }]}>Today's Affirmation</Text>

      {/* Main affirmation card */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 20 }}>
        <LinearGradient colors={[colors.deepIndigo, colors.purpleMid]} style={styles.bigCard}>
          <Text style={styles.bigCardEmoji}>{meta.emoji}</Text>
          <Text style={styles.bigCardCat}>{meta.label.toUpperCase()}</Text>
          <Text style={styles.bigCardText}>"{affirmation.text}"</Text>
          <View style={styles.bigCardActions}>
            <TouchableOpacity style={styles.bigCardBtn} onPress={handleFav} activeOpacity={0.75}>
              <Text style={[styles.bigCardBtnIcon, { color: isFav ? "#EC4899" : "rgba(255,255,255,0.7)" }]}>
                {isFav ? "♥" : "♡"}
              </Text>
              <Text style={styles.bigCardBtnLabel}>{isFav ? "Saved" : "Favourite"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bigCardBtn} onPress={handleNext} activeOpacity={0.75}>
              <Text style={styles.bigCardBtnIcon}>⟳</Text>
              <Text style={styles.bigCardBtnLabel}>Next</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Breathe it in */}
      <View style={[styles.breatheCard, { backgroundColor: colors.card, borderColor: colors.blush }]}>
        <Text style={[styles.breatheLabel, { color: colors.sage }]}>BREATHE IT IN</Text>
        <Text style={[styles.breatheBody, { color: colors.charcoal }]}>
          Say this affirmation aloud three times. Place one hand on your heart and let the words land in your body.
        </Text>
      </View>

      {/* Category chips */}
      <Text style={[styles.sectionLabel, { color: colors.sage, marginTop: 20, marginBottom: 10 }]}>EXPLORE BY THEME</Text>
      <View style={styles.chipRow}>
        {AFFIRMATION_CATEGORIES.map(cat => {
          const c = CAT_COLORS[cat.key] ?? colors.purpleMid;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.chip, { backgroundColor: `${c}12`, borderColor: `${c}30` }]}
              activeOpacity={0.75}
            >
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text style={[styles.chipLabel, { color: c }]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── Explore Tab ───────────────────────────────────────────────────────────────

function ExploreTab({
  userId,
  isAnonymous,
  favourites,
}: {
  userId: string | null;
  isAnonymous: boolean;
  favourites: FSFavouriteAffirmation[];
}) {
  const colors = useColors();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const displayed = useMemo(() => {
    if (!activeCategory) return AFFIRMATIONS;
    return AFFIRMATIONS.filter(a => a.category === activeCategory);
  }, [activeCategory]);

  const favSet = useMemo(() => new Set(favourites.map(f => f.affirmationId)), [favourites]);
  const favDocMap = useMemo(
    () => Object.fromEntries(favourites.map(f => [f.affirmationId, f.id])),
    [favourites]
  );

  const handleFav = useCallback(async (aff: Affirmation) => {
    if (!userId || isAnonymous) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (favSet.has(aff.id)) {
      const docId = favDocMap[aff.id];
      if (docId) await removeFavouriteAffirmation(userId, docId).catch(console.warn);
    } else {
      await addFavouriteAffirmation(userId, {
        text: aff.text,
        category: aff.category,
        affirmationId: aff.id,
      }).catch(console.warn);
    }
  }, [userId, isAnonymous, favSet, favDocMap]);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, flexDirection: "row" }}>
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: !activeCategory ? colors.deepIndigo : colors.cream, borderColor: !activeCategory ? colors.deepIndigo : colors.blush }]}
          onPress={() => { setActiveCategory(null); Haptics.selectionAsync(); }}
        >
          <Text style={[styles.filterChipText, { color: !activeCategory ? "#fff" : colors.sage }]}>All</Text>
        </TouchableOpacity>
        {AFFIRMATION_CATEGORIES.map(cat => {
          const active = activeCategory === cat.key;
          const c = CAT_COLORS[cat.key] ?? colors.purpleMid;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.filterChip, { backgroundColor: active ? c : colors.cream, borderColor: active ? c : colors.blush }]}
              onPress={() => { setActiveCategory(cat.key); Haptics.selectionAsync(); }}
            >
              <Text style={styles.filterChipEmoji}>{cat.emoji}</Text>
              <Text style={[styles.filterChipText, { color: active ? "#fff" : colors.sage }]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Affirmation list */}
      <View style={{ gap: 10 }}>
        {displayed.map(aff => {
          const c = CAT_COLORS[aff.category] ?? colors.purpleMid;
          const meta = getCategoryMeta(aff.category);
          const saved = favSet.has(aff.id);
          return (
            <View key={aff.id} style={[styles.exploreCard, { backgroundColor: colors.card, borderColor: colors.blush }]}>
              <View style={[styles.exploreMoodBox, { backgroundColor: `${c}15` }]}>
                <Text style={styles.exploreEmoji}>{meta.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exploreText, { color: colors.charcoal }]}>"{aff.text}"</Text>
                <View style={[styles.exploreCatBadge, { backgroundColor: `${c}12` }]}>
                  <Text style={[styles.exploreCatText, { color: c }]}>{meta.label}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleFav(aff)} style={styles.favBtn}>
                <Text style={[styles.favBtnIcon, { color: saved ? "#EC4899" : colors.blush }]}>
                  {saved ? "♥" : "♡"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── Mine Tab ──────────────────────────────────────────────────────────────────

function MineTab({
  userId,
  isAnonymous,
  favourites,
  custom,
}: {
  userId: string | null;
  isAnonymous: boolean;
  favourites: FSFavouriteAffirmation[];
  custom: FSCustomAffirmation[];
}) {
  const colors = useColors();
  const [showModal, setShowModal] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddCustom = useCallback(async () => {
    if (!userId || !newText.trim()) return;
    setSaving(true);
    try {
      await addCustomAffirmation(userId, newText.trim());
      setNewText("");
      setShowModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [userId, newText]);

  const handleDeleteCustom = useCallback((entry: FSCustomAffirmation) => {
    if (!userId) return;
    Alert.alert("Remove affirmation?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteCustomAffirmation(userId, entry.id).catch(console.warn) },
    ]);
  }, [userId]);

  const handleRemoveFav = useCallback((entry: FSFavouriteAffirmation) => {
    if (!userId) return;
    removeFavouriteAffirmation(userId, entry.id).catch(console.warn);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [userId]);

  if (isAnonymous) {
    return (
      <View style={styles.centreWrap}>
        <Text style={styles.bigEmoji}>💜</Text>
        <Text style={[styles.centreTitle, { color: colors.charcoal }]}>Sign in to save affirmations</Text>
        <Text style={[styles.centreBody, { color: colors.sage }]}>
          Favourite affirmations and write your own to build a personal collection that uplifts you daily.
        </Text>
        <TouchableOpacity
          style={[styles.emptyBtn, { backgroundColor: colors.deepIndigo }]}
          onPress={() => router.push("/(tabs)/profile")}
          activeOpacity={0.85}
        >
          <Text style={styles.emptyBtnText}>Sign in to your account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Favourites */}
        <Text style={[styles.sectionLabel, { color: colors.sage }]}>FAVOURITES ({favourites.length})</Text>
        {favourites.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cream, borderColor: colors.blush }]}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>♡</Text>
            <Text style={[styles.emptyText, { color: colors.sage }]}>Heart an affirmation in Explore to save it here</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginBottom: 24 }}>
            {favourites.map(f => {
              const c = CAT_COLORS[f.category] ?? colors.purpleMid;
              const meta = getCategoryMeta(f.category);
              return (
                <View key={f.id} style={[styles.mineCard, { backgroundColor: colors.card, borderColor: colors.blush }]}>
                  <View style={[styles.exploreMoodBox, { backgroundColor: `${c}15` }]}>
                    <Text style={styles.exploreEmoji}>{meta.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exploreText, { color: colors.charcoal }]}>"{f.text}"</Text>
                    <View style={[styles.exploreCatBadge, { backgroundColor: `${c}12` }]}>
                      <Text style={[styles.exploreCatText, { color: c }]}>{meta.label}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveFav(f)} style={styles.favBtn}>
                    <Text style={[styles.favBtnIcon, { color: "#EC4899" }]}>♥</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Custom */}
        <View style={styles.customHeader}>
          <Text style={[styles.sectionLabel, { color: colors.sage }]}>MY AFFIRMATIONS ({custom.length})</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.deepIndigo }]}
            onPress={() => setShowModal(true)}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {custom.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cream, borderColor: colors.blush }]}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>✍️</Text>
            <Text style={[styles.emptyText, { color: colors.sage }]}>Write your own affirmations here</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginBottom: 16 }}>
            {custom.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.mineCard, { backgroundColor: colors.card, borderColor: colors.blush }]}
                onLongPress={() => handleDeleteCustom(c)}
                activeOpacity={0.9}
              >
                <View style={[styles.exploreMoodBox, { backgroundColor: `${colors.purpleMid}15` }]}>
                  <Text style={styles.exploreEmoji}>💜</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exploreText, { color: colors.charcoal }]}>"{c.text}"</Text>
                  <Text style={[styles.exploreDate, { color: colors.sage }]}>
                    {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {custom.length > 0 && (
          <Text style={[styles.holdHint, { color: colors.blush }]}>Hold an entry to remove it</Text>
        )}
      </ScrollView>

      {/* Add affirmation modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.charcoal }]}>Write your affirmation</Text>
            <Text style={[styles.modalSub, { color: colors.sage }]}>
              Make it present tense, personal, and positive — "I am…", "I have…", "I trust…"
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.charcoal, borderColor: colors.blush }]}
              placeholder="I am…"
              placeholderTextColor={colors.sage}
              multiline
              value={newText}
              onChangeText={setNewText}
              autoFocus
              maxLength={200}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.modalSave, { backgroundColor: colors.deepIndigo, opacity: (!newText.trim() || saving) ? 0.5 : 1 }]}
              onPress={handleAddCustom}
              disabled={!newText.trim() || saving}
            >
              <Text style={styles.modalSaveText}>{saving ? "Saving…" : "Save affirmation"}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ── Root Screen ───────────────────────────────────────────────────────────────

export default function AffirmationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, isAnonymous } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [tab, setTab] = useState<Tab>("today");
  const [favourites, setFavourites] = useState<FSFavouriteAffirmation[]>([]);
  const [custom, setCustom] = useState<FSCustomAffirmation[]>([]);

  useEffect(() => {
    if (!userId || isAnonymous) return;
    const unsub1 = subscribeFavouriteAffirmations(userId, setFavourites);
    const unsub2 = subscribeCustomAffirmations(userId, setCustom);
    return () => { unsub1(); unsub2(); };
  }, [userId, isAnonymous]);

  const totalMine = favourites.length + custom.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.softWhite }}>
      <AshTreeBackground />
      {/* Header */}
      <LinearGradient colors={[colors.deepIndigo, colors.indigo2]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>DAILY AFFIRMATIONS</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2 }}>
            <LotusIcon size={20} />
            <Text style={styles.headerTitle}>Affirmations</Text>
          </View>
          <Text style={styles.headerSub}>Words that heal and uplift</Text>
        </View>
        {tab === "mine" && !isAnonymous && (
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => setTab("mine")}
          >
            <Feather name="plus" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.blush }]}>
        {([
          { key: "today",   label: "✦  Today" },
          { key: "explore", label: "🔍  Explore" },
          { key: "mine",    label: `💜  Mine${totalMine > 0 ? ` (${totalMine})` : ""}` },
        ] as { key: Tab; label: string }[]).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && { borderBottomColor: colors.deepIndigo, borderBottomWidth: 2 }]}
            onPress={() => { Haptics.selectionAsync(); setTab(t.key); }}
          >
            <Text style={[styles.tabLabel, { color: tab === t.key ? colors.deepIndigo : colors.sage }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "today" && <TodayTab userId={userId} isAnonymous={isAnonymous ?? false} favourites={favourites} />}
      {tab === "explore" && <ExploreTab userId={userId} isAnonymous={isAnonymous ?? false} favourites={favourites} />}
      {tab === "mine" && <MineTab userId={userId} isAnonymous={isAnonymous ?? false} favourites={favourites} custom={custom} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  headerLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  headerAddBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 13 },
  tabLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Today tab
  todayDate: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center", marginBottom: 4, letterSpacing: 0.4 },
  todayHeading: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 20 },
  bigCard: { borderRadius: 24, padding: 32, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 8 },
  bigCardEmoji: { fontSize: 52, marginBottom: 16 },
  bigCardCat: { color: "rgba(255,255,255,0.55)", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, marginBottom: 16 },
  bigCardText: { color: "#fff", fontSize: 20, fontFamily: "Inter_400Regular", fontStyle: "italic", lineHeight: 32, textAlign: "center", marginBottom: 28 },
  bigCardActions: { flexDirection: "row", gap: 32 },
  bigCardBtn: { alignItems: "center", gap: 6 },
  bigCardBtnIcon: { fontSize: 24, color: "rgba(255,255,255,0.8)" },
  bigCardBtnLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "Inter_500Medium" },
  breatheCard: { borderRadius: 18, borderWidth: 1, padding: 18 },
  breatheLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 8 },
  breatheBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Explore tab
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  filterChipEmoji: { fontSize: 13 },
  filterChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  exploreCard: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  exploreMoodBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  exploreEmoji: { fontSize: 22 },
  exploreText: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic", lineHeight: 21, marginBottom: 6 },
  exploreCatBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  exploreCatText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  exploreDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  favBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  favBtnIcon: { fontSize: 22 },

  // Mine tab
  centreWrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 24 },
  bigEmoji: { fontSize: 64, marginBottom: 20 },
  centreTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 10 },
  centreBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, maxWidth: 300 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", marginBottom: 20 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 16 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  customHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  addBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  mineCard: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  holdHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#DDD0F0", alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 8 },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 16 },
  modalInput: { minHeight: 100, fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16, textAlignVertical: "top" },
  modalSave: { borderRadius: 14, padding: 15, alignItems: "center" },
  modalSaveText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
