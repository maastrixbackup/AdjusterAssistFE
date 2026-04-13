import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { useAuth } from "@/providers/auth-provider";

export default function VerifyOtpScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width > 768;

  const { verifyPasswordResetOtp } = useAuth();

  const params = useLocalSearchParams<{ email?: string }>();
  const emailFromParams = useMemo(() => {
    if (Array.isArray(params.email)) return params.email[0] ?? "";
    return params.email ?? "";
  }, [params.email]);

  const [email, setEmail] = useState(emailFromParams.toLowerCase());
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState(false);

  const logoImg = require("../../assets/images/AdjusterAssist1.png");

  async function handleVerifyOtp() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    if (!normalizedEmail || normalizedOtp.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error("Invalid Input", {
        description: "Please enter a valid email and the 6-digit OTP.",
      });
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await verifyPasswordResetOtp(normalizedEmail, normalizedOtp);
      
      toast.success("Identity Verified", {
        description: "Your account has been confirmed.",
      });

      router.push({
        pathname: "/reset-password",
        params: { email: normalizedEmail, otp: normalizedOtp, verified: "1" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid OTP code.";
      toast.error("Verification Failed", { description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ══ ARC HEADER ══════════════════════════════════════════ */}
          <View style={[styles.arcHeader, { height: height * 0.32 }]}>
            <LinearGradient
              colors={["#276bbd", "#1e40af", "#172554"]}
              style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={styles.headerContent}>
              <View style={styles.logoContainer}>
                <Image
                  source={logoImg}
                  style={{
                    height: 40,
                    width: isTablet ? 240 : width * 0.45,
                    resizeMode: "contain",
                  }}
                />
              </View>
              <Text style={styles.arcTitle}>Verification</Text>
              <Text style={styles.arcSub}>Secure identity confirmation</Text>
            </SafeAreaView>
          </View>

          {/* ══ MAIN CARD ════════════════════════════════════════════ */}
          <View style={[styles.body, { marginTop: -40 }]}>
            <View style={[styles.card, isTablet && { maxWidth: 450, alignSelf: 'center' }]}>
              
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={32}
                  color="#1e40af"
                />
              </View>

              <View style={styles.textGroup}>
                <Text style={styles.title}>Confirm OTP</Text>
                <Text style={styles.subtitle}>
                  We&apos;ve sent a 6-digit security code to your registered email address.
                </Text>
              </View>

              {/* EMAIL INPUT */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <View style={[styles.inputBox, isEmailFocused && styles.inputActive]}>
                  <Feather name="mail" size={18} color={isEmailFocused ? "#1e40af" : "#94A3B8"} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    autoCapitalize="none"
                    placeholder="email@example.com"
                    style={styles.input}
                  />
                </View>
              </View>

              {/* OTP INPUT */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>6-DIGIT OTP CODE</Text>
                <View style={[styles.inputBox, isOtpFocused && styles.inputActive]}>
                  <Feather name="lock" size={18} color={isOtpFocused ? "#1e40af" : "#94A3B8"} />
                  <TextInput
                    value={otp}
                    onChangeText={(val) => setOtp(val.slice(0, 6))}
                    onFocus={() => setIsOtpFocused(true)}
                    onBlur={() => setIsOtpFocused(false)}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    placeholderTextColor="#CBD5E1"
                    style={[styles.input, { letterSpacing: 4, fontWeight: '700' }]}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#1e40af", "#1e3a8a"]}
                  style={styles.buttonInner}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Verify & Continue</Text>
                      <Feather name="check-circle" size={18} color="#FFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.footer}>
                <TouchableOpacity onPress={() => router.replace("/forgot-password")}>
                  <Text style={styles.backText}>Resend Code or Change Email</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scroll: { flexGrow: 1 },

  // Header
  arcHeader: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
    justifyContent: 'center',
  },
  headerContent: { paddingHorizontal: 30, alignItems: 'center' },
  logoContainer: {
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 20,
  },
  arcTitle: { fontSize: 26, fontWeight: "800", color: "#fff" },
  arcSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 },

  // Body/Card
  body: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 30,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: -60,
    borderWidth: 6,
    borderColor: "#FFF",
  },
  textGroup: { marginTop: 15, marginBottom: 25, alignItems: 'center' },
  title: { fontSize: 22, color: "#0F172A", fontWeight: "800" },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },

  // Form
  inputWrapper: { marginBottom: 16 },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    paddingHorizontal: 16,
    height: 56,
  },
  inputActive: { borderColor: "#1e40af", backgroundColor: "#FFF" },
  input: { flex: 1, marginLeft: 12, color: "#0F172A", fontSize: 15 },

  // Button
  button: { borderRadius: 18, overflow: "hidden", marginTop: 10 },
  buttonInner: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  buttonText: { color: "#FFF", fontWeight: "800", fontSize: 16 },

  // Footer
  footer: { marginTop: 25, alignItems: "center" },
  backText: { color: "#1e40af", fontWeight: "700", fontSize: 14 },
});