import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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

const STORAGE_KEYS = {
  sessions: "meditation_total_sessions",
  minutes: "meditation_total_minutes",
};

const TIME_PRESETS = [5, 10, 15, 20, 30] as const;

const PATTERNS = {
  box: {
    label: "Box Breathing",
    desc: "4·4·4·4  ·  Calm & focus",
    inhale: 4,
    holdIn: 4,
    exhale: 4,
    holdOut: 4,
  },
  relax478: {
    label: "4-7-8 Relax",
    desc: "4·7·8  ·  Deep relaxation",
    inhale: 4,
    holdIn: 7,
    exhale: 8,
    holdOut: 0,
  },
  deeprest: {
    label: "Deep Rest",
    desc: "4·2·6·2  ·  Restore & sleep",
    inhale: 4,
    holdIn: 2,
    exhale: 6,
    holdOut: 2,
  },
} as const;

type PatternKey = keyof typeof PATTERNS;
type Phase = "idle" | "inhale" | "hold_in" | "exhale" | "hold_out";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Press start",
  inhale: "Breathe In",
  hold_in: "Hold",
  exhale: "Breathe Out",
  hold_out: "Rest",
};

function animateTo(value: Animated.Value, toValue: number, duration: number): Promise<void> {
  return new Promise((resolve) => {
    Animated.timing(value, { toValue, duration, useNativeDriver: true }).start(() => resolve());
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function MeditationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { displayName } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [selectedMinutes, setSelectedMinutes] = useState<number>(10);
  const [selectedPattern, setSelectedPattern] = useState<PatternKey>("box");
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [phase, setPhase] = useState<Phase>("idle");
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  const isActiveRef = useRef(false);
  const breathAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEYS.sessions, STORAGE_KEYS.minutes])
      .then((pairs) => {
        setTotalSessions(parseInt(pairs[0][1] ?? "0") || 0);
        setTotalMinutes(parseInt(pairs[1][1] ?? "0") || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isRunning && !isComplete) {
      setTimeLeft(selectedMinutes * 60);
    }
  }, [selectedMinutes, isRunning, isComplete]);

  const stopEverything = useCallback(() => {
    isActiveRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    if (glowLoopRef.current) glowLoopRef.current.stop();
    breathAnim.stopAnimation();
    glowAnim.stopAnimation();
    Animated.parallel([
      Animated.timing(breathAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
    setPhase("idle");
  }, [breathAnim, glowAnim]);

  const handleComplete = useCallback(
    async (sessionsNow: number, minutesNow: number, mins: number) => {
      stopEverything();
      setIsComplete(true);
      setIsRunning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        const newSessions = sessionsNow + 1;
        const newMinutes = minutesNow + mins;
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.sessions, String(newSessions)],
          [STORAGE_KEYS.minutes, String(newMinutes)],
        ]);
        setTotalSessions(newSessions);
        setTotalMinutes(newMinutes);
      } catch {}
    },
    [stopEverything]
  );

  const runBreathLoop = useCallback(
    async (pattern: PatternKey) => {
      const p = PATTERNS[pattern];
      while (isActiveRef.current) {
        setPhase("inhale");
        await animateTo(breathAnim, 1, p.inhale * 1000);
        if (!isActiveRef.current) break;

        if (p.holdIn > 0) {
          setPhase("hold_in");
          await wait(p.holdIn * 1000);
          if (!isActiveRef.current) break;
        }

        setPhase("exhale");
        await animateTo(breathAnim, 0, p.exhale * 1000);
        if (!isActiveRef.current) break;

        if (p.holdOut > 0) {
          setPhase("hold_out");
          await wait(p.holdOut * 1000);
          if (!isActiveRef.current) break;
        }
      }
    },
    [breathAnim]
  );

  const handleStart = useCallback(() => {
    isActiveRef.current = true;
    setIsRunning(true);
    setIsComplete(false);
    setTimeLeft(selectedMinutes * 60);
    setPhase("inhale");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.2, duration: 3500, useNativeDriver: true }),
      ])
    );
    glowLoopRef.current = loop;
    loop.start();

    runBreathLoop(selectedPattern);

    const total = selectedMinutes * 60;
    const sessionsSnapshot = totalSessions;
    const minutesSnapshot = totalMinutes;
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 1;
      const remaining = total - elapsed;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleComplete(sessionsSnapshot, minutesSnapshot, selectedMinutes);
      }
    }, 1000);
  }, [selectedMinutes, selectedPattern, totalSessions, totalMinutes, runBreathLoop, handleComplete, glowAnim]);

  const handleStop = useCallback(() => {
    stopEverything();
    setIsRunning(false);
    setTimeLeft(selectedMinutes * 60);
  }, [stopEverything, selectedMinutes]);

  const handleReset = useCallback(() => {
    setIsComplete(false);
    setIsRunning(false);
    setTimeLeft(selectedMinutes * 60);
    setPhase("idle");
  }, [selectedMinutes]);

  const scale = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.0] });
  const innerOpacity = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.0] });

  const firstName = displayName?.split(" ")[0] ?? "Soul";

  return (
    <View style={{ flex: 1, backgroundColor: "#1A0E45" }}>
      <LinearGradient
        colors={["#1A0E45", "#2D1B69"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity
          onPress={() => { handleStop(); router.back(); }}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meditate</Text>
        <View style={styles.statsChip}>
          <Text style={styles.statsChipText}>
            {totalSessions} {totalSessions === 1 ? "session" : "sessions"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {isComplete ? (
          <View style={styles.completeWrap}>
            <Text style={styles.completeEmoji}>✨</Text>
            <Text style={styles.completeTitle}>Beautiful, {firstName}</Text>
            <Text style={styles.completeSub}>
              You completed a {selectedMinutes}-minute session.{"\n"}
              {totalSessions} {totalSessions === 1 ? "session" : "sessions"} · {totalMinutes} minutes total
            </Text>
            <View style={styles.completeActions}>
              <TouchableOpacity
                style={styles.againBtn}
                onPress={handleReset}
                activeOpacity={0.85}
              >
                <Text style={styles.againBtnText}>Meditate Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.journalBtn}
                onPress={() => router.push("/journal")}
                activeOpacity={0.85}
              >
                <Feather name="book" size={14} color="#fff" />
                <Text style={styles.journalBtnText}>Write in Journal</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {!isRunning && (
              <>
                <Text style={styles.sectionLabel}>DURATION</Text>
                <View style={styles.presetRow}>
                  {TIME_PRESETS.map((mins) => (
                    <TouchableOpacity
                      key={mins}
                      style={[styles.presetBtn, selectedMinutes === mins && styles.presetBtnActive]}
                      onPress={() => { setSelectedMinutes(mins); Haptics.selectionAsync(); }}
                    >
                      <Text style={[styles.presetText, selectedMinutes === mins && styles.presetTextActive]}>
                        {mins}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>BREATHING STYLE</Text>
                <View style={styles.patternList}>
                  {(Object.keys(PATTERNS) as PatternKey[]).map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.patternBtn, selectedPattern === key && styles.patternBtnActive]}
                      onPress={() => { setSelectedPattern(key); Haptics.selectionAsync(); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.patternLabel, selectedPattern === key && { color: "#fff" }]}>
                          {PATTERNS[key].label}
                        </Text>
                        <Text style={[styles.patternDesc, selectedPattern === key && { color: "rgba(255,255,255,0.6)" }]}>
                          {PATTERNS[key].desc}
                        </Text>
                      </View>
                      {selectedPattern === key && (
                        <Feather name="check-circle" size={16} color="rgba(201,168,76,0.9)" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Breathing circle */}
            <View style={styles.circleWrap}>
              <Animated.View
                style={[styles.glowRing, { opacity: glowAnim, transform: [{ scale }] }]}
              />
              <Animated.View
                style={[styles.breathCircle, { opacity: innerOpacity, transform: [{ scale }] }]}
              >
                <Text style={styles.circleTimer}>
                  {`${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`}
                </Text>
                <Text style={styles.circlePhase}>{PHASE_LABEL[phase]}</Text>
              </Animated.View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              {isRunning ? (
                <TouchableOpacity style={styles.stopBtn} onPress={handleStop} activeOpacity={0.85}>
                  <Feather name="square" size={18} color="#fff" />
                  <Text style={styles.stopBtnText}>Stop</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
                  <Text style={styles.startBtnText}>Begin Session</Text>
                </TouchableOpacity>
              )}
            </View>

            {totalMinutes > 0 && !isRunning && (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{totalSessions}</Text>
                  <Text style={styles.statLabel}>Sessions</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{totalMinutes}</Text>
                  <Text style={styles.statLabel}>Minutes</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, color: "#fff", fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  statsChip: { borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 10, paddingVertical: 4 },
  statsChipText: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Inter_500Medium" },
  sectionLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginTop: 28,
    marginBottom: 12,
  },
  presetRow: { flexDirection: "row", gap: 8 },
  presetBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  presetBtnActive: { backgroundColor: "rgba(201,168,76,0.15)", borderColor: "#C9A84C" },
  presetText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  presetTextActive: { color: "#C9A84C" },
  patternList: { gap: 8 },
  patternBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  patternBtnActive: { backgroundColor: "rgba(107,79,168,0.45)", borderColor: "rgba(107,79,168,0.7)" },
  patternLabel: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  patternDesc: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "Inter_400Regular" },
  circleWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 36,
    marginBottom: 32,
    height: 220,
  },
  glowRing: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(107,79,168,0.22)",
  },
  breathCircle: {
    width: 186,
    height: 186,
    borderRadius: 93,
    backgroundColor: "rgba(107,79,168,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(201,168,76,0.3)",
  },
  circleTimer: { color: "#fff", fontSize: 38, fontFamily: "Inter_700Bold", marginBottom: 6 },
  circlePhase: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  controls: { alignItems: "center" },
  startBtn: {
    backgroundColor: "#C9A84C",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 52,
  },
  startBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  stopBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_500Medium" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 18,
    gap: 32,
  },
  statItem: { alignItems: "center" },
  statNum: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 2 },
  statLabel: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.12)" },
  completeWrap: { alignItems: "center", paddingTop: 60 },
  completeEmoji: { fontSize: 72, marginBottom: 20 },
  completeTitle: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 10 },
  completeSub: { color: "rgba(255,255,255,0.55)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 40 },
  completeActions: { gap: 12, width: "100%" },
  againBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingVertical: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  againBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_500Medium" },
  journalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    paddingVertical: 15,
    backgroundColor: "#C9A84C",
  },
  journalBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
