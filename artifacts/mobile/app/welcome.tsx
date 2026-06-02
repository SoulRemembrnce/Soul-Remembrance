import { AshTreeBackground } from "@/components/AshTreeBackground";
import { LotusIcon } from "@/components/LotusIcon";
import { useApp } from "@/contexts/AppContext";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

type Mode = "signin" | "signup";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAnonymous, signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } = useApp();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!isAnonymous) {
      router.replace("/(tabs)" as any);
    }
  }, [isAnonymous]);

  const handleGoogle = useCallback(() => {
    setErrorMsg(null);
    signInWithGoogle();
  }, [signInWithGoogle]);

  const handleSubmit = useCallback(async () => {
    setErrorMsg(null);
    if (mode === "signup" && !displayName.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("Please enter your password.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, displayName.trim());
      }
    } catch (e: any) {
      const msg: string = e?.message ?? "Something went wrong.";
      if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        setErrorMsg("Incorrect email or password.");
      } else if (msg.includes("email-already-in-use")) {
        setErrorMsg("An account with this email already exists. Try signing in.");
      } else if (msg.includes("invalid-email")) {
        setErrorMsg("Please enter a valid email address.");
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, displayName, signInWithEmail, signUpWithEmail]);

  const handleForgot = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert("Reset password", "Enter your email address above first, then tap Forgot password.");
      return;
    }
    try {
      await sendPasswordReset(email.trim());
      Alert.alert("Reset email sent", `Check ${email.trim()} for a password reset link.`);
    } catch {
      Alert.alert("Error", "Could not send reset email. Check the address and try again.");
    }
  }, [email, sendPasswordReset]);

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setErrorMsg(null);
    setPassword("");
    setShowPassword(false);
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1A0E42", "#2D1B69", "#3D2496"]}
        style={StyleSheet.absoluteFill}
      />
      <AshTreeBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ───────────────────────────────────────────────────── */}
          <View style={styles.logoWrap}>
            <LotusIcon size={80} />
            <Text style={styles.appName}>Soul Remembrance</Text>
            <Text style={styles.tagline}>
              {mode === "signin"
                ? "Welcome back. Sign in to continue."
                : "Create your account to get started."}
            </Text>
          </View>

          {/* ── Google ─────────────────────────────────────────────────── */}
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle} activeOpacity={0.85}>
            <View style={styles.googleIconWrap}>
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* ── Divider ────────────────────────────────────────────────── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Fields ─────────────────────────────────────────────────── */}
          <View style={styles.fieldsWrap}>
            {/* Name — signup only */}
            {mode === "signup" && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Full name</Text>
                <View style={styles.inputRow}>
                  <Feather name="user" size={16} color="rgba(255,255,255,0.45)" style={styles.inputIcon} />
                  <TextInput
                    ref={nameRef}
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              </View>
            )}

            {/* Email */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Email address</Text>
              <View style={styles.inputRow}>
                <Feather name="mail" size={16} color="rgba(255,255,255,0.45)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password — with eye toggle */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputRow}>
                <Feather name="lock" size={16} color="rgba(255,255,255,0.45)" style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { flex: 1 }]}
                  placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={12}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={showPassword ? "#C9A84C" : "rgba(255,255,255,0.55)"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot password */}
            {mode === "signin" && (
              <TouchableOpacity style={styles.forgotBtn} onPress={handleForgot}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Error */}
            {errorMsg != null && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#FCA5A5" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#1A0E42" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Switch mode */}
            <Pressable
              style={styles.switchRow}
              onPress={() => switchMode(mode === "signin" ? "signup" : "signin")}
            >
              <Text style={styles.switchText}>
                {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <Text style={styles.switchLink}>
                {mode === "signin" ? "Create one" : "Sign in"}
              </Text>
            </Pressable>
          </View>

          {/* ── Privacy ────────────────────────────────────────────────── */}
          <View style={styles.legalRow}>
            <Text style={styles.legalText}>By continuing you agree to our </Text>
            <TouchableOpacity onPress={() => router.push("/terms" as any)}>
              <Text style={styles.legalLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.legalText}> and </Text>
            <TouchableOpacity onPress={() => router.push("/privacy" as any)}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1A0E42" },

  scroll: {
    paddingHorizontal: 28,
    gap: 20,
  },

  logoWrap: { alignItems: "center", gap: 12 },
  appName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 20,
  },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 12,
  },
  googleIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  googleBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#1a1a1a",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.18)" },
  dividerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },

  fieldsWrap: { gap: 14 },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#fff",
  },
  eyeBtn: {
    paddingLeft: 10,
  },

  forgotBtn: { alignSelf: "flex-end", marginTop: -4 },
  forgotText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#C9A84C",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#FCA5A5",
    flex: 1,
  },

  submitBtn: {
    backgroundColor: "#C9A84C",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#1A0E42",
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 2,
  },
  switchText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
  switchLink: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#C9A84C",
  },

  legalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  legalText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  legalLink: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.65)",
    textDecorationLine: "underline",
  },
});
