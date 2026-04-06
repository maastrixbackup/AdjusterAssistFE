import { useAuth } from "@/providers/auth-provider";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
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

export default function LoginScreen() {
  const { isHydrated, isAuthenticated, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<"email" | "pass" | null>(null);

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isHydrated]);

  if (!isHydrated || isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#040D1A", "#0A192F"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Missing Credentials", {
        description: "Please enter both email and password.",
      });
      return;
    }

    setLoading(true);
    // Focus dismissal prevents keyboard-related layout shifts during transition
    Keyboard.dismiss();

    try {
      await toast.promise(login(email.trim().toLowerCase(), password), {
        loading: "Authenticating...",
        success: () => "Welcome back!",
        error: (err) => (err instanceof Error ? err.message : "Login failed"),
      });
    } catch (error) {
      console.error("Login Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.mainContainer}>
        <StatusBar style="light" translucent />
        <LinearGradient colors={["#040D1A", "#0A192F", "#020617"]} style={StyleSheet.absoluteFill} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex1}
          // Offset helps prevent the card from being pushed too high on iOS
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            // Prevents flicker on iOS when keyboard appears
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            <SafeAreaView style={styles.safeArea} edges={['top']}>
              
              {/* Logo Section */}
              <View style={styles.headerSection}>
                <View style={styles.logoGlassBackground}>
                  <Image source={logoImg} style={styles.logo} />
                </View>
                <Text style={styles.welcomeText}>Welcome Back</Text>
                <Text style={styles.brandSubtitle}>Secure Access for Adjusters</Text>
              </View>

              {/* Glass Card */}
              <View style={styles.glassCard}>
                <Text style={styles.cardTitle}>Sign In</Text>

                {/* Email Input */}
                <View style={styles.inputBox}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={[
                    styles.inputWrapper,
                    focusedInput === "email" && styles.inputWrapperActive
                  ]}>
                    <Feather name="mail" size={18} color={focusedInput === "email" ? "#38BDF8" : "#64748B"} />
                    <TextInput
                      placeholder="name@company.com"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedInput("email")}
                      onBlur={() => setFocusedInput(null)}
                      selectionColor="#38BDF8"
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputBox}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Password</Text>
                    <Pressable onPress={() => router.push("/forgot-password")} disabled={loading}>
                      <Text style={styles.forgotText}>Forgot?</Text>
                    </Pressable>
                  </View>
                  <View style={[
                    styles.inputWrapper,
                    focusedInput === "pass" && styles.inputWrapperActive
                  ]}>
                    <Feather name="lock" size={18} color={focusedInput === "pass" ? "#38BDF8" : "#64748B"} />
                    <TextInput
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedInput("pass")}
                      onBlur={() => setFocusedInput(null)}
                      selectionColor="#38BDF8"
                      editable={!loading}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
                      <Ionicons 
                        name={showPassword ? "eye-off" : "eye"} 
                        size={20} 
                        color="#64748B" 
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Login Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.loginButton,
                    (pressed || loading) && { opacity: 0.8 },
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={["#38BDF8", "#1D4ED8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <View style={styles.btnContent}>
                        <Text style={styles.loginButtonText}>CONTINUE</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#FFF" />
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* Footer */}
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Don&apos;t have an account?</Text>
                  <Pressable onPress={() => router.push("/signup")} disabled={loading}>
                    <Text style={styles.signupText}>Join Now</Text>
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  flex1: { flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: "center",
    paddingVertical: 40 
  },
  safeArea: { paddingHorizontal: 22, alignItems: "center" },
  headerSection: { alignItems: "center", marginBottom: 30 },
  logoGlassBackground: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 20,
  },
  logo: { width: width * 0.5, height: 40, resizeMode: "contain" },
  welcomeText: { fontSize: 26, fontWeight: "900", color: "#FFF", letterSpacing: -0.5 },
  brandSubtitle: { fontSize: 13, color: "#94A3B8", marginTop: 4, fontWeight: "500" },
  glassCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#FFF", marginBottom: 25, textAlign: 'center', letterSpacing: 1 },
  inputBox: { width: "100%", marginBottom: 18 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 10, fontWeight: "900", color: "#64748B", letterSpacing: 1, textTransform: "uppercase" },
  forgotText: { fontSize: 11, fontWeight: "700", color: "#38BDF8" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  inputWrapperActive: { borderColor: "#38BDF8", backgroundColor: "rgba(56, 189, 248, 0.03)" },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: "#FFF", fontWeight: "600" },
  loginButton: { borderRadius: 16, overflow: "hidden", marginTop: 10 },
  buttonGradient: { height: 58, justifyContent: "center", alignItems: "center" },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loginButtonText: { color: "#FFF", fontSize: 14, fontWeight: "900", letterSpacing: 1.2 },
  footerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 25, gap: 5 },
  footerText: { color: "#64748B", fontSize: 13, fontWeight: "500" },
  signupText: { color: "#38BDF8", fontSize: 13, fontWeight: "800" },
});