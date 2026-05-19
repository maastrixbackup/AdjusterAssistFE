import { resendVerificationEmail } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width > 768;

  const { isHydrated, isAuthenticated, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const logoImg = require("../../assets/images/AdjusterAssist1.png");

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isHydrated]);

  useEffect(() => {
    if (showResend) {
      setShowResend(false);
    }
  }, [email, password]);

  if (!isHydrated || isAuthenticated) {
    return (
      <View style={styles.loaderWrap}>
        <LinearGradient colors={["#276bbd", "rgb(28, 49, 119)"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error("Missing Credentials", {
        description: "Please enter both email and password.",
      });
      return;
    }

    // Initial soft feedback for button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

    if (Platform.OS === "android") {
      Keyboard.dismiss();
    }

    try {
      await toast.promise(login(email.trim(), password), {
        loading: "Verifying credentials...",
        success: (data) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowResend(false);
          return "Welcome back!";
        },
        error: (err: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
          // Safely extract the custom data keys sent from your backend Express API
          const errorTarget = err?.response?.data || err?.data || err ;
          const errorCode = errorTarget?.code;
          const errorMessage = errorTarget?.message || "Invalid credentials";

          console.log("🔍 Handled UI Response Target:", { errorCode, errorMessage });

          // Clear tracking matches perfectly against our new structural code
          if (errorCode === "EMAIL_NOT_VERIFIED" || errorMessage.includes("verify your email")) {
            setShowResend(true);
            return "Please verify your email before signing in.";
          }

          return errorMessage;
        }
      });

      // iOS Keyboard dismissal often feels smoother after the transition starts
      if (Platform.OS === "ios") {
        setTimeout(() => Keyboard.dismiss(), 500);
      }

    } catch (error) {
      console.error("Login attempt failed", error);
    }
  }

  async function handleResendVerification() {
    if (!email.trim()) {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );

      toast.error("Email Required", {
        description:
          "Please enter your email address first.",
      });

      return;
    }

    try {
      setResendLoading(true);

      Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Soft
      );

      await toast.promise(
        resendVerificationEmail({
          email: email.trim(),
        }),
        {
          loading: "Sending verification email...",

          success: (data) => {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );

            return (
              data?.message ||
              "Verification email sent successfully."
            );
          },

          error: (err: any) => {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Error
            );

            return (
              err?.message ||
              "Failed to resend verification email."
            );
          },
        }
      );

    } catch (error) {
      console.error(
        "Resend verification failed:",
        error
      );

    } finally {

      setResendLoading(false);

    }
  }

  // Responsive Logo Settings
  const logoStyle = {
    height: 50,
    width: isTablet ? 240 : width * 0.5,
    resizeMode: "contain" as const,
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            keyboardOpen && Platform.OS === "android" && { paddingBottom: 50 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ══ PREMIUM ARC HEADER ══════════════════════════════════════════ */}
          <View style={[styles.arcHeader, { height: height * 0.35 }]}>
            <LinearGradient
              colors={["#276bbd", "#1e40af", "#172554"]}
              style={StyleSheet.absoluteFill}
            />

            {/* Ambient Background Circles */}
            <View style={[styles.bubble, { top: -40, right: -40, width: 200, height: 200 }]} />
            <View style={[styles.bubble, { bottom: -20, left: -20, width: 120, height: 120, opacity: 0.03 }]} />

            <SafeAreaView style={styles.headerContent}>
              <View style={styles.logoContainer}>
                <Image source={logoImg} style={logoStyle} />
              </View>

              <View style={styles.welcomeTextSection}>
                <Text style={styles.arcTitle}>Welcome Back</Text>
                <Text style={styles.arcSub}>Enter your details to access your claims</Text>
              </View>
            </SafeAreaView>
          </View>

          {/* ══ FORM BODY ════════════════════════════════════════════════ */}
          <View style={[styles.body, { marginTop: -40 }]}>
            <View style={[styles.card, isTablet && { maxWidth: 480, alignSelf: 'center' }]}>

              {/* EMAIL FIELD */}
              <View style={styles.inputWrapper}>
                <Text style={styles.fieldLabel}>WORK EMAIL</Text>
                <View style={[styles.inputBox, focused === "email" && styles.inputActive]}>
                  <Feather name="mail" size={18} color={focused === "email" ? "#1e40af" : "#94A3B8"} />
                  <TextInput
                    placeholder="name@company.com"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* PASSWORD FIELD */}
              <View style={styles.inputWrapper}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <View style={[styles.inputBox, focused === "pass" && styles.inputActive]}>
                  <Feather name="lock" size={18} color={focused === "pass" ? "#1e40af" : "#94A3B8"} />
                  <TextInput
                    placeholder="Enter your password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused("pass")}
                    onBlur={() => setFocused(null)}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#94A3B8"
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable onPress={() => router.push("/forgot-password")} style={styles.forgotWrap}>
                <Text style={styles.forgot}>Forgot Password?</Text>
              </Pressable>

              {/* LOGIN BUTTON */}
              <Pressable
                style={({ pressed }) => [styles.button, pressed && { transform: [{ scale: 0.98 }] }]}
                onPress={handleLogin}
              >
                <LinearGradient
                  colors={["#1e40af", "#1e3a8a"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnInner}
                >
                  <Text style={styles.btnText}>Sign In</Text>
                  <View style={styles.btnArrow}>
                    <Feather name="arrow-right" size={16} color="#1e40af" />
                  </View>
                </LinearGradient>
              </Pressable>

              {showResend && (
                <View style={styles.verifyBox}>
                  <Text style={styles.verifyText}>
                    Your email address is not verified yet.
                  </Text>
                  <Pressable
                    style={[styles.resendButton, resendLoading && { opacity: 0.6 }]}
                    onPress={handleResendVerification}
                    disabled={resendLoading}
                  >
                    <Text style={styles.resendText}>
                      {resendLoading ? "Sending verification link..." : "Resend Verification Email"}
                    </Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don&apos;t have an account? </Text>
                <Pressable onPress={() => router.push("/signup")}>
                  <Text style={styles.link}>Create One</Text>
                </Pressable>
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flexGrow: 1 },

  // Header Styles
  arcHeader: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
    justifyContent: 'center',
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerContent: {
    paddingHorizontal: 30,
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  welcomeTextSection: {
    alignItems: 'center',
  },
  arcTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  arcSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: 'center',
  },

  // Form Styles
  body: {
    flex: 1,
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    paddingHorizontal: 16,
    height: 60,
    gap: 12,
  },
  inputActive: {
    borderColor: "#1e40af",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: '500',
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginBottom: 25,
  },
  forgot: {
    fontSize: 13,
    color: "#1e40af",
    fontWeight: "700",
  },
  button: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 25,
  },
  btnInner: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  btnArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  footerText: {
    color: "#64748B",
    fontSize: 14,
  },
  link: {
    color: "#1e40af",
    fontSize: 14,
    fontWeight: "800",
  },
  resendButton: {
    marginTop: -10,
    marginBottom: 20,
    alignItems: "center",
  },

  resendText: {
    color: "#1e40af",
    fontWeight: "700",
    fontSize: 14,
  },
  verifyBox: {
    marginTop: -5,
    marginBottom: 20,
    alignItems: "center",
  },

  verifyText: {
    color: "#64748B",
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
  },
});