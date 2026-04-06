import { useAuth } from "@/providers/auth-provider";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  useEffect(() => {
    // Entrance Animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    // Background Subtle Pulse Loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 8000, useNativeDriver: false }),
        Animated.timing(bgAnim, { toValue: 0, duration: 8000, useNativeDriver: false }),
      ])
    ).start();

    if (Platform.OS === "android") {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor("transparent");
    }
  }, []);

  const interpolatedBg = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#040D1A", "#0A192F"],
  });

  async function handleReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Email Required", { description: "Enter your registered email." });
      return;
    }

    try {
      setLoading(true);
      Keyboard.dismiss();
      await sendPasswordReset(normalizedEmail);
      toast.success("OTP Sent", { description: "Check your inbox for the code." });
      router.push({
        pathname: "/verify-otp",
        params: { email: normalizedEmail },
      });
    } catch (error) {
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <Animated.View style={[styles.root, { backgroundColor: interpolatedBg }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        
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
              
              {/* 1. Logo Pedestal - High Visibility */}
              <Animated.View style={[styles.logoWrapper, { opacity: fadeAnim }]}>
                <View style={styles.logoGlassBackground}>
                  <Image source={logoImg} style={styles.logo} />
                </View>
                <View style={styles.logoGlow} />
              </Animated.View>

              {/* 2. Glass-morphic Form Card */}
              <Animated.View 
                style={[
                  styles.glassCard, 
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                ]}
              >
                <View style={styles.iconBadge}>
                  <MaterialCommunityIcons name="shield-sync-outline" size={34} color="#38BDF8" />
                </View>

                <Text style={styles.title}>Recovery</Text>
                <Text style={styles.subtitle}>
                  Enter your email to receive a secure{"\n"}one-time password (OTP).
                </Text>

                <View style={styles.inputBox}>
                  <Text style={styles.label}>Registered Email</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#38BDF8" style={{ opacity: 0.7 }} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="name@company.com"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      style={styles.input}
                      selectionColor="#38BDF8"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleReset}
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
                        <Text style={styles.btnText}>SEND OTP</Text>
                        <Ionicons name="send-sharp" size={16} color="#FFF" />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Footer Links */}
                <View style={styles.footer}>
                  <TouchableOpacity onPress={() => router.replace("/login")}>
                    <Text style={styles.backLink}>Back to Login</Text>
                  </TouchableOpacity>

                  <View style={styles.dividerRow}>
                    <View style={styles.line} />
                    <Text style={styles.orText}>OR</Text>
                    <View style={styles.line} />
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push("/verify-otp")}
                    style={styles.otpLinkBtn}
                  >
                    <Text style={styles.otpLinkText}>I already have an OTP</Text>
                    <Ionicons name="chevron-forward" size={16} color="#38BDF8" />
                  </TouchableOpacity>
                </View>
              </Animated.View>

            </SafeAreaView>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    // justifyContent: "center",
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 40 
  },
  container: { paddingHorizontal: 22, alignItems: "center" },

  // Logo Section
  logoWrapper: { marginBottom: 40, alignItems: "center" },
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
  title: { fontSize: 28, fontWeight: "900", color: "#FFF", marginBottom: 10 },
  subtitle: { fontSize: 14, color: "#94A3B8", textAlign: "center", lineHeight: 22, marginBottom: 35 },

  // Input Section
  inputBox: { width: "100%", marginBottom: 25 },
  label: { fontSize: 11, fontWeight: "900", color: "#64748B", marginBottom: 10, letterSpacing: 1.5, textTransform: "uppercase" },
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
  actionBtn: { width: "100%", height: 60, borderRadius: 20, overflow: "hidden", elevation: 8 },
  btnGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnText: { color: "#FFF", fontSize: 15, fontWeight: "900", letterSpacing: 1.5 },

  // Footer
  footer: { width: "100%", alignItems: "center", marginTop: 30 },
  backLink: { color: "#94A3B8", fontSize: 14, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 25 },
  line: { flex: 1, height: 1, backgroundColor: "rgba(255, 255, 255, 0.05)" },
  orText: { marginHorizontal: 15, color: "#475569", fontSize: 11, fontWeight: "900" },
  otpLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.1)",
  },
  otpLinkText: { color: "#38BDF8", fontSize: 14, fontWeight: "800" },
});