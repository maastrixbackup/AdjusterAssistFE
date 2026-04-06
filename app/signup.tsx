import { useAuth } from "@/providers/auth-provider";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

const { width } = Dimensions.get("window");
type RoleType = "pa" | "ca";

export default function SignupScreen() {
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleType>("ca");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  const validatePassword = (pass: string) => {
    if (pass.length < 6) return "Password must be at least 6 characters.";
    if (!/[a-zA-Z]/.test(pass)) return "Include at least one letter.";
    if (!/\d/.test(pass)) return "Include at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "Include a special character.";
    return null;
  };

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error("Missing Fields", { description: "Please fill in all fields." });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      toast.error("Mismatch", { description: "Passwords do not match." });
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    Keyboard.dismiss();

    try {
      await toast.promise(signup(name.trim(), email.trim().toLowerCase(), role, password), {
        loading: 'Creating your profile...',
        success: () => {
          setTimeout(() => router.replace("/login"), 1500);
          return 'Account Created! Redirecting...';
        },
        error: (err) => err instanceof Error ? err.message : "Signup failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.mainContainer}>
        <StatusBar style="light" translucent />
        <LinearGradient colors={["#040D1A", "#0A192F", "#020617"]} style={StyleSheet.absoluteFill} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex1}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            <SafeAreaView style={styles.safeArea} edges={['top']}>
              
              <View style={styles.headerSection}>
                <View style={styles.logoGlassBackground}>
                  <Image source={logoImg} style={styles.logo} />
                </View>
                <Text style={styles.welcomeText}>Create Account</Text>
                <Text style={styles.brandSubtitle}>Join the next generation of adjusting</Text>
              </View>

              <View style={styles.glassCard}>
                <Text style={styles.cardTitle}>Sign Up</Text>

                {/* Name Input */}
                <View style={styles.inputBox}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={[styles.inputWrapper, focusedInput === "name" && styles.inputWrapperActive]}>
                    <Feather name="user" size={18} color={focusedInput === "name" ? "#38BDF8" : "#64748B"} />
                    <TextInput
                      placeholder="John Doe"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={styles.input}
                      value={name}
                      onChangeText={(t) => { setName(t); setErrorMessage(null); }}
                      onFocus={() => setFocusedInput("name")}
                      onBlur={() => setFocusedInput(null)}
                      selectionColor="#38BDF8"
                    />
                  </View>
                </View>

                {/* Email Input */}
                <View style={styles.inputBox}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={[styles.inputWrapper, focusedInput === "email" && styles.inputWrapperActive]}>
                    <Feather name="mail" size={18} color={focusedInput === "email" ? "#38BDF8" : "#64748B"} />
                    <TextInput
                      placeholder="name@company.com"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={(t) => { setEmail(t); setErrorMessage(null); }}
                      onFocus={() => setFocusedInput("email")}
                      onBlur={() => setFocusedInput(null)}
                      selectionColor="#38BDF8"
                    />
                  </View>
                </View>

                {/* Role Selector */}
                <View style={styles.inputBox}>
                  <Text style={styles.label}>Select Your Role</Text>
                  <View style={styles.roleRow}>
                    <Pressable
                      style={[styles.roleButton, role === "ca" && styles.roleButtonActive]}
                      onPress={() => setRole("ca")}
                    >
                      <Ionicons name="business" size={16} color={role === "ca" ? "#FFF" : "#64748B"} />
                      <Text style={[styles.roleButtonText, role === "ca" && styles.roleButtonTextActive]}>Licensed</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.roleButton, role === "pa" && styles.roleButtonActive]}
                      onPress={() => setRole("pa")}
                    >
                      <Ionicons name="shield-checkmark" size={16} color={role === "pa" ? "#FFF" : "#64748B"} />
                      <Text style={[styles.roleButtonText, role === "pa" && styles.roleButtonTextActive]}>Public</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Password */}
                <View style={styles.inputBox}>
                  <Text style={styles.label}>Password</Text>
                  <View style={[styles.inputWrapper, focusedInput === "pass" && styles.inputWrapperActive]}>
                    <Feather name="lock" size={18} color={focusedInput === "pass" ? "#38BDF8" : "#64748B"} />
                    <TextInput
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      value={password}
                      onChangeText={(t) => { setPassword(t); setErrorMessage(null); }}
                      onFocus={() => setFocusedInput("pass")}
                      onBlur={() => setFocusedInput(null)}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color="#64748B" />
                    </Pressable>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputBox}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={[styles.inputWrapper, focusedInput === "confirm" && styles.inputWrapperActive]}>
                    <Feather name="shield" size={18} color={focusedInput === "confirm" ? "#38BDF8" : "#64748B"} />
                    <TextInput
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); setErrorMessage(null); }}
                      onFocus={() => setFocusedInput("confirm")}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>

                {errorMessage && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, (pressed || loading) && { opacity: 0.8 }]}
                  onPress={handleSignup}
                  disabled={loading}
                >
                  <LinearGradient colors={["#38BDF8", "#1D4ED8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>CREATE ACCOUNT</Text>}
                  </LinearGradient>
                </Pressable>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>Already have an account?</Text>
                  <Pressable onPress={() => router.push("/login")}>
                    <Text style={styles.loginLink}>Log In</Text>
                  </Pressable>
                </View>
              </View>
            </SafeAreaView>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#020617" },
  flex1: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 40 },
  safeArea: { paddingHorizontal: 22, alignItems: "center" },
  headerSection: { alignItems: "center", marginBottom: 25 },
  logoGlassBackground: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 15,
  },
  logo: { width: width * 0.45, height: 35, resizeMode: "contain" },
  welcomeText: { fontSize: 24, fontWeight: "900", color: "#FFF", letterSpacing: -0.5 },
  brandSubtitle: { fontSize: 13, color: "#94A3B8", marginTop: 4, fontWeight: "500" },
  glassCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#FFF", marginBottom: 20, textAlign: 'center', letterSpacing: 1 },
  inputBox: { width: "100%", marginBottom: 15 },
  label: { fontSize: 10, fontWeight: "900", color: "#64748B", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 14,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  inputWrapperActive: { borderColor: "#38BDF8", backgroundColor: "rgba(56, 189, 248, 0.03)" },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: "#FFF", fontWeight: "600" },
  roleRow: { flexDirection: "row", gap: 10 },
  roleButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  roleButtonActive: { backgroundColor: "#1D4ED8", borderColor: "#38BDF8" },
  roleButtonText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  roleButtonTextActive: { color: "#FFF" },
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: 10, borderRadius: 12, marginBottom: 15, gap: 8 },
  errorText: { color: "#EF4444", fontSize: 12, fontWeight: "600" },
  submitBtn: { borderRadius: 16, overflow: "hidden", marginTop: 5 },
  btnGradient: { height: 58, justifyContent: "center", alignItems: "center" },
  btnText: { color: "#FFF", fontSize: 14, fontWeight: "900", letterSpacing: 1.2 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20, gap: 5 },
  footerText: { color: "#64748B", fontSize: 13, fontWeight: "500" },
  loginLink: { color: "#38BDF8", fontSize: 13, fontWeight: "800" },
});