import { useAuth } from "@/providers/auth-provider";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
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

export default function ForgotPasswordScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width > 768;

  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const logoImg = require("../../assets/images/AdjusterAssist1.png");

  async function handleReset() {
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error("Invalid Email", {
        description: "Please enter a valid email address.",
      });
      return;
    }
    try {
      setLoading(true);
      Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Medium
      );
      await sendPasswordReset(normalizedEmail);

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      toast.success("OTP Sent", {
        description: "Check your email for the 8-digit recovery code.",
      });

      setTimeout(() => {
        router.push({
          pathname: "/reset-password",
          params: {
            email: normalizedEmail,
          },
        });
      }, 1200);

    } catch (error: any) {
      toast.error("Reset Password Failed", {
        description:
          error?.message ||
          "Unable to send OTP",
      });
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
          <View style={[styles.arcHeader, { height: Math.min(Math.max(height * 0.28, 220), 300) }]}>
            <LinearGradient
              colors={["#276bbd", "#1e40af", "#172554"]}
              style={StyleSheet.absoluteFill}
            />

            {/* Decorative Background Elements */}
            <View style={[styles.bubble, { top: -20, left: -20, width: 150, height: 150 }]} />

            <SafeAreaView style={styles.headerContent}>
              <View style={styles.logoContainer}>
                <Image
                  source={logoImg}
                  style={{
                    height: 45,
                    width: isTablet ? 240 : width * 0.5,
                    resizeMode: "contain",
                  }}
                />
              </View>
              <Text style={styles.arcTitle}>Recovery</Text>
              <Text style={styles.arcSub}>Recover your password securely</Text>
            </SafeAreaView>
          </View>

          {/* ══ MAIN CARD ════════════════════════════════════════════ */}
          <View style={[styles.body, { marginTop: -30 }]}>
            <View style={[styles.card, isTablet && { maxWidth: 450, alignSelf: 'center' }]}>

              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="shield-refresh-outline"
                  size={32}
                  color="#1e40af"
                />
              </View>

              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter your registered email and we&apos;ll send you an 8-digit recovery code.
              </Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>REGISTERED EMAIL</Text>
                <View style={[styles.inputBox, isFocused && styles.inputActive]}>
                  <Feather
                    name="mail"
                    size={18}
                    color={isFocused ? "#1e40af" : "#94A3B8"}
                  />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={handleReset}
                    placeholder="john@example.com"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#1e40af", "#1e3a8a"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonInner}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Send Recovery OTP</Text>
                      <View style={styles.btnArrow}>
                        <Feather name="arrow-right" size={16} color="#1e40af" />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alreadyOtpButton, loading && { opacity: 0.6 }]}
                disabled={loading}
                activeOpacity={0.85}
                onPress={() => {
                  router.push({
                    pathname: "/reset-password",
                    params: {
                      email: email.trim().toLowerCase() || undefined,
                    },
                  });
                }}
              >
                <Feather name="key" size={15} color="#1e40af" />
                <Text style={styles.alreadyOtpText}>Already have an OTP?</Text>
              </TouchableOpacity>
              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={() => router.replace("/login")}
                  style={styles.backButton}
                >
                  <Feather name="chevron-left" size={16} color="#64748B" />
                  <Text style={styles.backText}>Back to Login</Text>
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

  // Header Section
  arcHeader: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
    justifyContent: 'center',
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  headerContent: {
    paddingHorizontal: 30,
    alignItems: 'center'
  },
  logoContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  arcTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5
  },
  arcSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: 'center',
    marginTop: 4
  },

  // Body Section
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
    marginTop: -24,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 30,
    padding: 24,
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    maxWidth:460
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: -52, // Sits on top of the card
    borderWidth: 6,
    borderColor: "#FFF",
  },
  textGroup: {
    marginTop: 20,
    marginBottom: 25,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    color: "#0F172A",
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },

  // Input styling
  inputWrapper: {
    marginBottom: 24,
  },
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
  inputActive: {
    borderColor: "#1e40af",
    backgroundColor: "#FFF",
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: '500',
  },

  // Button styling
  button: {
    borderRadius: 18,
    overflow: "hidden",
  },
  buttonInner: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 16,
  },
  btnArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },

  // Footer
  footer: {
    marginTop: 25,
    alignItems: "center",
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  backText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 14,
  },
  alreadyOtpButton: {
    marginTop: 14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  alreadyOtpText: {
    color: "#1e40af",
    fontSize: 14,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.7,
  }
});