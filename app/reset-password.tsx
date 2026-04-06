import { useAuth } from "@/providers/auth-provider";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

const { width } = Dimensions.get("window");

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const params = useLocalSearchParams<{
    email?: string;
    otp?: string;
    verified?: string;
  }>();

  // Logic remains identical
  const email = useMemo(() => {
    if (Array.isArray(params.email)) return (params.email[0] ?? "").toLowerCase();
    return (params.email ?? "").toLowerCase();
  }, [params.email]);

  const otp = useMemo(() => {
    if (Array.isArray(params.otp)) return params.otp[0] ?? "";
    return params.otp ?? "";
  }, [params.otp]);

  const verified = useMemo(() => {
    if (Array.isArray(params.verified)) return params.verified[0] === "1";
    return params.verified === "1";
  }, [params.verified]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    if (Platform.OS === "android") {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor("transparent");
    }
  }, []);

  async function handleResetPassword() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    if (!verified || !normalizedEmail || !normalizedOtp) {
      toast.error("Session Expired", { description: "Please verify OTP again." });
      router.replace({
        pathname: "/verify-otp",
        params: normalizedEmail ? { email: normalizedEmail } : undefined,
      });
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error("Required Fields", { description: "Please fill in both password fields." });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Password Mismatch", { description: "Passwords do not match." });
      return;
    }

    try {
      setLoading(true);
      await toast.promise(
        resetPassword(normalizedEmail, normalizedOtp, newPassword),
        {
          loading: "Updating security credentials...",
          success: () => {
            setTimeout(() => router.replace("/login"), 1500);
            return "Password updated successfully!";
          },
          error: (err) => err instanceof Error ? err.message : "Unable to reset password",
        }
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        
        {/* Theme Consistent Gradient */}
        <LinearGradient colors={["#040D1A", "#0A192F", "#020617"]} style={StyleSheet.absoluteFill} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <SafeAreaView style={styles.container}>
              
              {/* Logo Pedestal */}
              <Animated.View style={[styles.logoWrapper, { opacity: fadeAnim }]}>
                <View style={styles.logoGlassBackground}>
                  <Image source={logoImg} style={styles.logo} />
                </View>
                <View style={styles.logoGlow} />
              </Animated.View>

              {/* Glass Card */}
              <Animated.View 
                style={[
                  styles.glassCard, 
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                ]}
              >
                <View style={styles.iconBadge}>
                  <MaterialCommunityIcons name="lock-reset" size={34} color="#38BDF8" />
                </View>

                <Text style={styles.title}>New Password</Text>
                <Text style={styles.subtitle}>
                  Identity verified for <Text style={styles.emailHighlight}>{email || "user"}</Text>.{"\n"}Set your new secure password below.
                </Text>

                {/* New Password Input */}
                <View style={styles.inputBox}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={18} color="#38BDF8" style={{ opacity: 0.7 }} />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      style={styles.input}
                      selectionColor="#38BDF8"
                      editable={!loading}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputBox}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="shield" size={18} color="#38BDF8" style={{ opacity: 0.7 }} />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      style={styles.input}
                      selectionColor="#38BDF8"
                      editable={!loading}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#38BDF8", "#1D4ED8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btnGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <View style={styles.btnContent}>
                        <Text style={styles.btnText}>UPDATE PASSWORD</Text>
                        <MaterialCommunityIcons name="check-decagram" size={18} color="#FFF" />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.backTouch} 
                  onPress={() => router.replace({
                    pathname: "/verify-otp",
                    params: email ? { email } : undefined,
                  })}
                >
                  <Text style={styles.backLink}>Back to Verification</Text>
                </TouchableOpacity>
              </Animated.View>

            </SafeAreaView>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  scrollContent: { 
    flexGrow: 1, 
    // justifyContent: "center",
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 40 
  },
  container: { paddingHorizontal: 22, alignItems: "center" },

  // Logo Style (Shared across flow)
  logoWrapper: { marginBottom: 35, alignItems: "center" },
  logoGlassBackground: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 2,
  },
  logoGlow: {
    position: "absolute",
    width: 140,
    height: 70,
    backgroundColor: "#38BDF8",
    borderRadius: 100,
    opacity: 0.1,
    zIndex: 1,
  },
  logo: { width: width * 0.55, height: 48, resizeMode: "contain" },

  // Glass Card
  glassCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 35,
    paddingHorizontal: 24,
    paddingVertical: 35,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
  },
  iconBadge: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  title: { fontSize: 26, fontWeight: "900", color: "#FFF", marginBottom: 10 },
  subtitle: { fontSize: 14, color: "#94A3B8", textAlign: "center", lineHeight: 22, marginBottom: 35 },
  emailHighlight: { color: "#38BDF8", fontWeight: "700" },

  // Inputs
  inputBox: { width: "100%", marginBottom: 20 },
  label: { fontSize: 11, fontWeight: "900", color: "#64748B", marginBottom: 10, letterSpacing: 1.2, textTransform: "uppercase" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: "#FFF", fontWeight: "600" },

  // Button
  actionBtn: { width: "100%", height: 62, borderRadius: 20, overflow: "hidden", marginTop: 15, elevation: 8 },
  btnGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnText: { color: "#FFF", fontSize: 15, fontWeight: "900", letterSpacing: 1.5 },

  // Footer
  backTouch: { marginTop: 25 },
  backLink: { color: "#64748B", fontSize: 14, fontWeight: "700" },
});