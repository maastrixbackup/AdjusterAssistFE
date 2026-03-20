import { useAuth } from "@/providers/auth-provider";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const { isHydrated, isAuthenticated, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<"email" | "pass" | null>(null);

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isHydrated]);

  if (!isHydrated || isAuthenticated) {
    return (
      <View style={[styles.mainContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={["#276bbd", "#0B3C7A"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await login(email.trim(), password);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid credentials";
      setErrorMessage(message);
      setLoading(false);
    }
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />
      <LinearGradient colors={["#276bbd", "#0B3C7A"]} style={StyleSheet.absoluteFill} />
      
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />

      <KeyboardAvoidingView
        // FIX: Using 'padding' for iOS and null for Android often resolves flicker
        // Android handles keyboard resizing natively better via the Manifest
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex1}
        // FIX: Offset ensures the input isn't glued to the keyboard
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          // FIX: Helps with input focus jitter
          keyboardShouldPersistTaps="handled"
          // FIX: Prevents the "bounce" effect from triggering layout re-renders
          bounces={false}
          // FIX: Prevents unnecessary scrolling when keyboard is hidden
          scrollEnabled={height < 700 || focusedInput !== null}
        >
          <SafeAreaView style={styles.safeArea}>
            
            <View style={styles.headerSection}>
              <View style={styles.logoBadge}>
                <Image source={logoImg} style={styles.logo} />
              </View>
              <Text style={styles.welcomeText}>Welcome Back</Text>
              <Text style={styles.brandSubtitle}>Secure Access for Adjusters</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sign In</Text>

              <View style={[styles.inputContainer, focusedInput === "email" && styles.inputContainerActive]}>
                <Feather name="mail" size={18} color={focusedInput === "email" ? "#276bbd" : "#94A3B8"} />
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(v) => { setEmail(v); setErrorMessage(null); }}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              <View style={[styles.inputContainer, focusedInput === "pass" && styles.inputContainerActive]}>
                <Feather name="lock" size={18} color={focusedInput === "pass" ? "#276bbd" : "#94A3B8"} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrorMessage(null); }}
                  onFocus={() => setFocusedInput("pass")}
                  onBlur={() => setFocusedInput(null)}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#94A3B8" />
                </Pressable>
              </View>

              <Pressable onPress={() => router.push("/forgot-password")}>
                <Text style={styles.forgotLabel}>Forgot Password?</Text>
              </Pressable>

              {errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#276bbd", "#1E63B6"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginButtonText}>Continue</Text>}
                </LinearGradient>
              </Pressable>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>New here?</Text>
                <Pressable onPress={() => router.push("/signup")}>
                  <Text style={styles.signupText}>Create Account</Text>
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
  flex1: { flex: 1 },
  orb: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  orbTop: { top: -width * 0.2, right: -width * 0.2 },
  orbBottom: { bottom: -width * 0.1, left: -width * 0.3 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' }, // FIX: Keeps card centered
  safeArea: { paddingHorizontal: 24, paddingBottom: 20 },
  headerSection: { alignItems: "center", marginBottom: 30 },
  logoBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 15,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  logo: { width: 180, height: 45, resizeMode: "contain" },
  welcomeText: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  brandSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: "500" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    padding: 28,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#1E293B", marginBottom: 24 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 58,
    marginBottom: 16,
  },
  inputContainerActive: { borderColor: "#276bbd", backgroundColor: "#FFFFFF" },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: "#0F172A", fontWeight: "500" },
  forgotLabel: { textAlign: "right", color: "#64748B", fontSize: 14, fontWeight: "600", marginBottom: 20 },
  loginButton: { borderRadius: 16, overflow: "hidden", marginTop: 10 },
  buttonGradient: { height: 58, justifyContent: "center", alignItems: "center" },
  loginButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", padding: 12, borderRadius: 12, marginBottom: 20, gap: 8 },
  errorText: { color: "#EF4444", fontSize: 13, fontWeight: "600" },
  footerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24, gap: 6 },
  footerText: { color: "#64748B", fontSize: 14, fontWeight: "500" },
  signupText: { color: "#276bbd", fontSize: 14, fontWeight: "700" },
});