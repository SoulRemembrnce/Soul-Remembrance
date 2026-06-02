import { AshTreeBackground } from "@/components/AshTreeBackground";
import { LotusIcon } from "@/components/LotusIcon";
import { useApp } from "@/contexts/AppContext";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

type Mode = "landing" | "signin" | "signup";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAnonymous, signInWithGoogle, signInWithEmail, signUpWithEmail } = useApp();

  const [mode, setMode] = useState<Mode>("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAnonymous) {
      router.replace("/(tabs)" as any);
    }
  }, [isAnonymous]);

  const handleGoogle = useCallback(() => {
    setErrorMsg(null);
    signInWithGoogle();
  }, [signInWithGoogle]);

  const handleEmail = useCallback(async () => {
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    if (mode === "signup" && !displayName.trim()) {
      setErrorMsg("Please enter your name.");
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

  const handleForgot = useCallback(() => {
    if (!email.trim()) {
      Alert.alert("Reset password", "Enter your email above first, then tap Forgot password.");
      return;
    }
    Alert.alert("Reset email sent", `Check ${email} for a password reset link.`);
  }, [email]);

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setErrorMsg(null);
  }, []);

  const isLanding = mode === "landing";

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1A0E42", "#2D1B69", "#3D2496"]}
        style={StyleSheet.absoluteFill}
      />
      <AshTreeBackground />

      {isLanding ? (
        /* ── Landing ─────────────────────────────────────────────────────── */
        <View
          style={[
            styles.landingInner,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
          ]}
        >
          <View style={styles.logoWrap}>
            <LotusIcon size={88} />
            <Text style={styles.appName}>Soul Remembrance</Text>
            <Text style={styles.tagline}>
              Discover healing practitioners.{"\n"}Book sessions. Grow within.
            </Text>
          </View>

          <View style={styles.btnStack}>
            <GoogleButton onPress={handleGoogle} />

            <Divider />

            <TouchableOpacity
              style={styles.emailBtn}
              onPress={() => switchMode("signin")}
              activeOpacity={0.85}
            >
              <Feather name="mail" size={18} color="#fff" />
              <Text style={styles.emailBtnText}>Sign in with email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => switchMode("signup")}
              activeOpacity={0.85}
            >
              <Text style={styles.createBtnText}>Create an account</Text>
            </TouchableOpacity>
          </View>

          <LegalRow />
        </View>
      ) : (
        /* ── Email form ───────────────────────────────────────────────────── */
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={[
              styles.formScroll,
              { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => switchMode("landing")}
            >
              <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            <View style={styles.formLogoRow}>
              <LotusIcon size={52} />
              <Text style={styles.formTitle}>
                {mode === "signin" ? "Welcome back" : "Create account"}
              </Text>
              <Text style={styles.formSub}>
                {mode === "signin"
                  ? "Sign in to your Soul Remembrance account"
                  : "Join Soul Remembrance today"}
              </Text>
            </View>

            <GoogleButton onPress={handleGoogle} />
            <Divider />

            <View style={styles.fieldsWrap}>
              {mode === "signup" && (
                <FormField label="Full name">
                  <Feather name="user" size={16} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </FormField>
              )}

              <FormField label="Email address">
                <Feather name="mail" size={16} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                />
              </FormField>

              <FormField label="Password">
                <Feather name="lock" size={16} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleEmail}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={16}
                    color="rgba(255,255,255,0.45)"
                  />
                </TouchableOpacity>
              </FormField>

              {mode === "signin" && (
                <TouchableOpacity style={styles.forgotBtn} onPress={handleForgot}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              {errorMsg != null && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color="#FCA5A5" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleEmail}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {mode === "signin" ? "Sign in" : "Create account"}
                  </Text>
                )}
              </TouchableOpacity>

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

            <LegalRow style={{ marginTop: 24 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// ── Small sub-components (no hooks — safe to use in both branches) ────────────

function GoogleButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.googleBtn} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.googleIconWrap}>
        <Text style={styles.googleG}>G</Text>
      </View>
      <Text style={styles.googleBtnText}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

function Divider() {
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: "rgba(255,255,255,0.18)" }]} />
      <Text style={styles.dividerText}>or</Text>
      <View style={[styles.dividerLine, { backgroundColor: "rgba(255,255,255,0.18)" }]} />
    </View>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>{children}</View>
    </View>
  );
}

function LegalRow({ style }: { style?: object }) {
  return (
    <View style={[styles.legalRow, style]}>
      <Text style={styles.legalText}>By continuing you agree to our </Text>
      <TouchableOpacity onPress={() => router.push("/terms" as any)}>
        <Text style={styles.legalLink}>Terms</Text>
      </TouchableOpacity>
      <Text style={styles.legalText}> and </Text>
      <TouchableOpacity onPress={() => router.push("/privacy" as any)}>
        <Text style={styles.legalLink}>Privacy Policy</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1A0E42" },

  landingInner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  logoWrap: { alignItems: "center", gap: 14 },
  appName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
  },

  btnStack: { gap: 12 },

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
    marginVertical: 2,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },

  emailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  emailBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  createBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  createBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
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

  formScroll: { paddingHorizontal: 24, gap: 0 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  formLogoRow: { alignItems: "center", gap: 10, marginBottom: 28 },
  formTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  formSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 20,
  },

  fieldsWrap: { gap: 14, marginTop: 16 },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.3,
  },
  inputWrap: {
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
    marginTop: 4,
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
    paddingVertical: 4,
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
});
