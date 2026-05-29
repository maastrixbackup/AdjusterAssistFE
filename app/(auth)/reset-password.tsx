import { useAuth } from "@/providers/auth-provider";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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

export default function ResetPasswordScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width > 768;

  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();

  const {
    verifyPasswordResetOtp,
    resetPasswordWithVerifiedOtp,
    sendPasswordReset,
  } = useAuth();

  const [email, setEmail] = useState(String(emailParam || ""));
  const [otp, setOtp] = useState("");
  const [verifiedAccessToken, setVerifiedAccessToken] = useState<string | null>(
    null,
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);

  const logoImg = require("../../assets/images/AdjusterAssist1.png");

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "Password must be at least 8 characters long.";
    if (!/\d/.test(pass)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) {
      return "Password must contain at least one special character.";
    }
    return null;
  };

  const handleVerifyOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error("Email Required", {
        description: "Please enter your registered email address.",
      });
      return;
    }

    if (otp.length !== 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error("Invalid OTP", {
        description: "Please enter the 6-digit recovery code.",
      });
      return;
    }

    try {
      setVerifying(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const accessToken = await verifyPasswordResetOtp(normalizedEmail, otp);
      setVerifiedAccessToken(accessToken);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("OTP Verified", {
        description: "Now create your new password.",
      });
      setTimeout(() => {
        setShowPasswordModal(true);
      }, 650);
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error("Verification Failed", {
        description: error?.message || "Invalid or expired recovery code.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSavePassword = async () => {
    const passwordError = validatePassword(newPassword);

    if (passwordError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error("Weak Password", { description: passwordError });
      return;
    }

    if (newPassword !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error("Password Mismatch", {
        description: "New password and confirm password do not match.",
      });
      return;
    }

    if (!verifiedAccessToken) {
      toast.error("Session Expired", {
        description: "Please verify your OTP again.",
      });
      setShowPasswordModal(false);
      return;
    }

    try {
      setSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await resetPasswordWithVerifiedOtp(verifiedAccessToken, newPassword);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Password Updated", {
        description: "Please login with your new password.",
      });

      setShowPasswordModal(false);
      setVerifiedAccessToken(null);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      toast.error("Reset Failed", {
        description: error?.message || "Unable to update password.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResendOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Email Required", {
        description: "Please enter your email before requesting a new OTP.",
      });
      return;
    }

    try {
      setResending(true);
      await sendPasswordReset(normalizedEmail);

      toast.success("OTP Sent", {
        description: "A new recovery code has been sent to your email.",
      });
    } catch (error: any) {
      toast.error("Unable to Resend", {
        description: error?.message || "Please try again.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.arcHeader, { height: height * 0.32 }]}>
            <LinearGradient
              colors={["#276bbd", "#1e40af", "#172554"]}
              style={StyleSheet.absoluteFill}
            />

            <View
              style={[
                styles.bubble,
                { top: -30, left: -30, width: 150, height: 150 },
              ]}
            />
            <View
              style={[
                styles.bubble,
                { bottom: 20, right: -40, width: 120, height: 120 },
              ]}
            />

            <SafeAreaView style={styles.headerContent}>
              <View style={styles.logoContainer}>
                <Image
                  source={logoImg}
                  style={[
                    styles.logo,
                    { width: isTablet ? 240 : width * 0.48 },
                  ]}
                />
              </View>

              <Text style={styles.arcTitle}>Verify Recovery</Text>
              <Text style={styles.arcSub}>
                Enter your OTP to unlock password reset
              </Text>
            </SafeAreaView>
          </View>

          <View style={[styles.body, { marginTop: -20 }]}>
            <View
              style={[
                styles.card,
                isTablet && { maxWidth: 460, alignSelf: "center" },
              ]}
            >
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="shield-key-outline"
                  size={32}
                  color="#1e40af"
                />
              </View>

              <View style={styles.textGroup}>
                <Text style={styles.title}>Enter Recovery OTP</Text>
                <Text style={styles.subtitle}>
                  Use the 6-digit code sent to your registered email.
                </Text>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <View
                  style={[
                    styles.inputBox,
                    focusedField === "email" && styles.inputActive,
                  ]}
                >
                  <Feather
                    name="mail"
                    size={18}
                    color={focusedField === "email" ? "#1e40af" : "#94A3B8"}
                  />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="you@example.com"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>6-DIGIT OTP</Text>
                <View
                  style={[
                    styles.inputBox,
                    focusedField === "otp" && styles.inputActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="numeric"
                    size={20}
                    color={focusedField === "otp" ? "#1e40af" : "#94A3B8"}
                  />
                  <TextInput
                    value={otp}
                    onChangeText={(text) =>
                      setOtp(text.replace(/\D/g, "").slice(0, 6))
                    }
                    onFocus={() => setFocusedField("otp")}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#94A3B8"
                    style={[styles.input, styles.otpInput]}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendOtp}
                disabled={resending || verifying}
                activeOpacity={0.85}
              >
                {resending ? (
                  <ActivityIndicator size="small" color="#1e40af" />
                ) : (
                  <>
                    <Feather name="refresh-cw" size={14} color="#1e40af" />
                    <Text style={styles.resendText}>Resend OTP</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, verifying && { opacity: 0.75 }]}
                onPress={handleVerifyOtp}
                disabled={verifying}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={
                    verifying
                      ? ["#94a3b8", "#64748b"]
                      : ["#1e40af", "#1e3a8a"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonInner}
                >
                  {verifying ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Verify OTP</Text>
                      <View style={styles.buttonIcon}>
                        <Feather name="arrow-right" size={16} color="#1e40af" />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.footer}>
                <TouchableOpacity onPress={() => router.replace("/login")}>
                  <Text style={styles.backText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!saving) setShowPasswordModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboard}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => {
                if (!saving) {
                  setNewPassword("");
                  setConfirmPassword("");
                  setShowPasswordModal(false);
                }
              }}
            />

            <View style={styles.passwordCard}>
              <View style={styles.passwordTopIcon}>
                <MaterialCommunityIcons
                  name="lock-reset"
                  size={30}
                  color="#1e40af"
                />
              </View>

              <Text style={styles.modalTitle}>Create New Password</Text>
              <Text style={styles.modalSubtitle}>
                Choose a strong password to secure your account.
              </Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                <View
                  style={[
                    styles.inputBox,
                    focusedField === "new" && styles.inputActive,
                  ]}
                >
                  <Feather
                    name="lock"
                    size={18}
                    color={focusedField === "new" ? "#1e40af" : "#94A3B8"}
                  />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    onFocus={() => setFocusedField("new")}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    placeholder="Min. 8 characters"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                <View
                  style={[
                    styles.inputBox,
                    focusedField === "confirm" && styles.inputActive,
                  ]}
                >
                  <Feather
                    name="shield"
                    size={18}
                    color={
                      focusedField === "confirm" ? "#1e40af" : "#94A3B8"
                    }
                  />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setFocusedField("confirm")}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Repeat password"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.passwordHint}>
                <Feather name="info" size={14} color="#64748B" />
                <Text style={styles.passwordHintText}>
                  Use 8+ characters with a number and special character.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, saving && { opacity: 0.75 }]}
                onPress={handleSavePassword}
                disabled={saving}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={
                    saving
                      ? ["#94a3b8", "#64748b"]
                      : ["#1e40af", "#1e3a8a"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonInner}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Save New Password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => {
                  if (!saving) setShowPasswordModal(false);
                }}
                disabled={saving}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scroll: { flexGrow: 1 },

  arcHeader: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
    justifyContent: "center",
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  headerContent: {
    paddingHorizontal: 30,
    alignItems: "center",
  },
  logoContainer: {
    marginBottom: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  logo: { height: 40, resizeMode: "contain" },
  arcTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  arcSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.68)",
    marginTop: 4,
    textAlign: "center",
    fontWeight: "600",
  },

  body: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 24,
    shadowColor: "#1e40af",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
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
    borderColor: "#FFFFFF",
  },
  textGroup: {
    marginTop: 15,
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    color: "#0F172A",
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "500",
  },

  inputWrapper: { marginBottom: 16 },
  inputLabel: {
    fontSize: 10,
    fontWeight: "900",
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
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "600",
  },
  otpInput: {
    letterSpacing: 4,
    fontWeight: "800",
  },
  eyeBtn: { padding: 4 },

  resendButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -4,
    marginBottom: 18,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  resendText: {
    color: "#1e40af",
    fontSize: 13,
    fontWeight: "800",
  },

  button: {
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 4,
  },
  buttonInner: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  buttonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  backText: {
    color: "#1e40af",
    fontWeight: "800",
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  modalKeyboard: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  passwordCard: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 20,
  },
  passwordTopIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  modalSubtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 22,
    fontWeight: "500",
  },
  passwordHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  passwordHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
    fontWeight: "600",
  },
  cancelModalBtn: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelModalText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "800",
  },
});