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
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
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

  async function handleSignup() {
    // 1. Validation (Immediate feedback)
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error("Missing Fields", {
        description: "Please fill in all fields to create your account.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Password Mismatch", {
        description: "The passwords you entered do not match.",
      });
      return;
    }

    // 2. The "Awesome" Promise Flow
    // We wrap the signup call in a promise toast
    toast.promise(signup(name.trim(), email.trim(), role, password), {
      loading: 'Creating your profile...',
      success: () => {
        // This runs when the signup promise resolves
        setTimeout(() => router.replace("/login"), 1500); // Small delay so they see the success toast
        return 'Account Created! Redirecting to login...';
      },
      error: (err) => {
        // This runs if the signup promise rejects
        return err instanceof Error ? err.message : "Signup failed";
      },
    });
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />

      {/* Background Layer */}
      <LinearGradient colors={["#276bbd", "#0B3C7A"]} style={StyleSheet.absoluteFill} />

      {/* Decorative Background Effects (Glass Orbs) */}
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SafeAreaView style={styles.safeArea}>

            <View style={styles.headerSection}>
              <View style={styles.logoBadge}>
                <Image source={logoImg} style={styles.logo} />
              </View>
              <Text style={styles.welcomeText}>Create Account</Text>
              <Text style={styles.brandSubtitle}>Join the next generation of adjusting</Text>
            </View>

            <View style={styles.card}>
              {/* Name Input */}
              <View style={[styles.inputContainer, focusedInput === "name" && styles.inputActive]}>
                <Feather name="user" size={18} color={focusedInput === "name" ? "#276bbd" : "#94A3B8"} />
                <TextInput
                  placeholder="Full Name"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={name}
                  onChangeText={(t) => { setName(t); setErrorMessage(null); }}
                  onFocus={() => setFocusedInput("name")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Email Input */}
              <View style={[styles.inputContainer, focusedInput === "email" && styles.inputActive]}>
                <Feather name="mail" size={18} color={focusedInput === "email" ? "#276bbd" : "#94A3B8"} />
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErrorMessage(null); }}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Role Selector */}
              <Text style={styles.label}>Select Your Role</Text>
              <View style={styles.roleRow}>
                <Pressable
                  style={[styles.roleButton, role === "ca" && styles.roleButtonActive]}
                  onPress={() => setRole("ca")}
                >
                  <Ionicons name="business" size={16} color={role === "ca" ? "#FFF" : "#64748B"} />
                  <Text style={[styles.roleButtonText, role === "ca" && styles.roleButtonTextActive]}>Carrier (CA)</Text>
                </Pressable>
                <Pressable
                  style={[styles.roleButton, role === "pa" && styles.roleButtonActive]}
                  onPress={() => setRole("pa")}
                >
                  <Ionicons name="shield-checkmark" size={16} color={role === "pa" ? "#FFF" : "#64748B"} />
                  <Text style={[styles.roleButtonText, role === "pa" && styles.roleButtonTextActive]}>Public (PA)</Text>
                </Pressable>
              </View>

              {/* Password */}
              <View style={[styles.inputContainer, focusedInput === "pass" && styles.inputActive]}>
                <Feather name="lock" size={18} color={focusedInput === "pass" ? "#276bbd" : "#94A3B8"} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrorMessage(null); }}
                  onFocus={() => setFocusedInput("pass")}
                  onBlur={() => setFocusedInput(null)}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color="#94A3B8" />
                </Pressable>
              </View>

              {/* Confirm Password */}
              <View style={[styles.inputContainer, focusedInput === "confirm" && styles.inputActive]}>
                <Feather name="shield" size={18} color={focusedInput === "confirm" ? "#276bbd" : "#94A3B8"} />
                <TextInput
                  placeholder="Confirm Password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setErrorMessage(null); }}
                  onFocus={() => setFocusedInput("confirm")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
                onPress={handleSignup}
                disabled={loading}
              >
                <LinearGradient colors={["#276bbd", "#1E63B6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Create Account</Text>}
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
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#0B3C7A" },

  // Background Orbs
  orb: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  orbTop: {
    top: -width * 0.2,
    right: -width * 0.2,
  },
  orbBottom: {
    bottom: -width * 0.1,
    left: -width * 0.3,
  },

  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  headerSection: { alignItems: "center", marginBottom: 30, marginTop: 20 },
  logoBadge: { backgroundColor: "rgba(255,255,255,0.1)", padding: 12, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  logo: { width: 180, height: 40, resizeMode: "contain" },
  welcomeText: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  brandSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: "500" },

  card: { backgroundColor: "#FFFFFF", borderRadius: 30, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  label: { fontSize: 13, fontWeight: "700", color: "#64748B", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },

  roleRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  roleButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 45, borderRadius: 12, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  roleButtonActive: { backgroundColor: "#276bbd", borderColor: "#276bbd" },
  roleButtonText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  roleButtonTextActive: { color: "#FFFFFF" },

  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, paddingHorizontal: 15, height: 54, marginBottom: 14 },
  inputActive: { borderColor: "#276bbd", backgroundColor: "#FFF" },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: "#1E293B", fontWeight: "500" },

  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", padding: 12, borderRadius: 12, marginBottom: 15, gap: 8 },
  errorText: { color: "#EF4444", fontSize: 13, fontWeight: "600" },

  submitBtn: { borderRadius: 14, overflow: "hidden", marginTop: 10, elevation: 3 },
  btnGradient: { height: 56, justifyContent: "center", alignItems: "center" },
  btnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20, gap: 5 },
  footerText: { color: "#64748B", fontSize: 14, fontWeight: "500" },
  loginLink: { color: "#276bbd", fontSize: 14, fontWeight: "700" },
});