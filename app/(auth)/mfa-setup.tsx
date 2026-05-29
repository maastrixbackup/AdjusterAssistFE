import RecoveryCodesModal from "@/components/RecoveryCodesModal";
import { AuthSession } from "@/lib/services/authService";
import { enrollMFA, verifyMFAEnrollment } from "@/lib/services/mfaService";
import { useAuth } from "@/providers/auth-provider";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { SvgXml } from "react-native-svg";
import { toast } from "sonner-native";

type VerifiedSessionWithCodes = AuthSession & {
  recovery_codes?: string[];
};

export default function MFASetupScreen() {
  const { width, height } = useWindowDimensions();

  const isTablet = width >= 768;
  const isSmallDevice = height < 720;
  const qrSize = isTablet ? 230 : isSmallDevice ? 200 : 220;

  const { mfaTempSession, completeMfaLogin, logout } = useAuth();

  const [factorId, setFactorId] = useState("");
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [otp, setOtp] = useState("");

  const [focused, setFocused] = useState(false);
  const [loadingEnroll, setLoadingEnroll] = useState(true);
  const [loadingVerify, setLoadingVerify] = useState(false);

  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [verifiedSession, setVerifiedSession] =
    useState<VerifiedSessionWithCodes | null>(null);

  const getQrSvgXml = useCallback((value: string) => {
    if (!value) return "";

    try {
      if (value.startsWith("data:image/svg+xml;base64,")) {
        const base64 = value.replace("data:image/svg+xml;base64,", "");
        return atob(base64);
      }

      if (value.startsWith("data:image/svg+xml")) {
        const commaIndex = value.indexOf(",");
        if (commaIndex === -1) return "";

        const svgContent = value.substring(commaIndex + 1);

        return svgContent.includes("%3C")
          ? decodeURIComponent(svgContent)
          : svgContent;
      }

      if (value.trim().startsWith("<svg")) {
        return value;
      }

      return "";
    } catch {
      return "";
    }
  }, []);

  const qrXml = useMemo(() => getQrSvgXml(qrCode), [qrCode, getQrSvgXml]);

  const handleEnroll = useCallback(async () => {
    if (!mfaTempSession?.temp_access_token) return;

    try {
      setLoadingEnroll(true);

      const data = await enrollMFA({
        temp_access_token: mfaTempSession.temp_access_token,
      });

      setFactorId(data.factor_id || "");
      setSecret(data.secret || "");
      setQrCode(data.qr_code || data.uri || "");

      if (!data.qr_code && !data.uri) {
        toast.error("QR setup unavailable", {
          description: "Use the manual setup key instead.",
        });
      }
    } catch (error: any) {
      toast.error("Unable to prepare MFA setup", {
        description:
          error?.message || "Please try again or return to login.",
      });
    } finally {
      setLoadingEnroll(false);
    }
  }, [mfaTempSession]);

  useEffect(() => {
    if (!mfaTempSession?.temp_access_token) {
      router.replace("/login");
      return;
    }

    handleEnroll();
  }, [mfaTempSession?.temp_access_token, handleEnroll]);

  async function handleCopySecret() {
    if (!secret) {
      toast.error("Setup key unavailable");
      return;
    }

    try {
      await Clipboard.setStringAsync(secret);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      toast.success("Setup key copied", {
        description: "Paste this key into your authenticator app.",
      });
    } catch {
      toast.error("Unable to copy setup key");
    }
  }

  async function handleVerify() {
    if (!mfaTempSession) return;

    const code = otp.trim();

    if (!factorId || code.length !== 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      toast.error("Invalid verification code", {
        description: "Enter the 6-digit code from your authenticator app.",
      });

      return;
    }

    try {
      setLoadingVerify(true);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const session = await verifyMFAEnrollment({
        factor_id: factorId,
        code,
        temp_access_token: mfaTempSession.temp_access_token,
      });

      const sessionWithCodes = session as VerifiedSessionWithCodes;

      setVerifiedSession(sessionWithCodes);
      setRecoveryCodes(sessionWithCodes.recovery_codes || []);
      setShowRecoveryModal(true);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      toast.success("MFA enabled successfully", {
        description: "Save your recovery codes before continuing.",
      });
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      toast.error("Verification failed", {
        description:
          error?.message || "The code is invalid or expired. Please try again.",
      });
    } finally {
      setLoadingVerify(false);
    }
  }

  async function handleRecoveryCodesSaved() {
    if (!verifiedSession) {
      toast.error("Session missing", {
        description: "Please verify MFA again.",
      });
      return;
    }

    await completeMfaLogin(verifiedSession);

    setShowRecoveryModal(false);
    router.replace("/(tabs)");
  }

  function handleCancel() {
    logout();
    router.replace("/login");
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.topSafeArea} />
      <StatusBar style="light"/>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="always"
        >
          <View
            style={[
              styles.arcHeader,
              {
                height: isSmallDevice ? 110 : Math.max(125, height * 0.12),
              },
            ]}
          >
            <LinearGradient
              colors={["#276bbd", "#1e40af", "#172554"]}
              style={StyleSheet.absoluteFill}
            />

            <View
              style={[
                styles.bubble,
                { top: -10, right: -42, width: 190, height: 190 },
              ]}
            />
            <View
              style={[
                styles.bubble,
                { bottom: -32, left: -32, width: 125, height: 125 },
              ]}
            />
          </View>

          <View
            style={[
              styles.body,
              { marginTop: isSmallDevice ? -42 : -54 },
            ]}
          >
            <View style={[styles.card, isTablet && styles.tabletCard]}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={30}
                  color="#1e40af"
                />
              </View>

              <Text style={styles.title}>Secure Your Account</Text>

              <Text style={styles.subtitle}>
                Use an authenticator app to add an extra layer of security to
                your account.
              </Text>

              {loadingEnroll ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#1e40af" />
                  <Text style={styles.loadingText}>
                    Preparing secure setup...
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIcon}>
                      <Feather name="camera" size={15} color="#1e40af" />
                    </View>

                    <View style={styles.sectionTextWrap}>
                      <Text style={styles.sectionTitle}>Scan QR Code</Text>
                      <Text style={styles.sectionSubtitle}>
                        Use Google Authenticator, Microsoft Authenticator,
                        Authy, or any TOTP app.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.qrOuterContainer}>
                    <View style={styles.qrWrapper}>
                      {qrXml ? (
                        <View
                          style={{
                            width: qrSize,
                            height: qrSize,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#fff",
                          }}
                        >
                          <SvgXml xml={qrXml} width={qrSize} height={qrSize} />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.qrFallback,
                            { width: qrSize, height: qrSize },
                          ]}
                        >
                          <Feather
                            name="alert-circle"
                            size={22}
                            color="#64748B"
                          />
                          <Text style={styles.qrFallbackText}>
                            QR code unavailable
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.secretBox}>
                    <View style={styles.secretHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.secretLabel}>
                          MANUAL SETUP KEY
                        </Text>
                        <Text style={styles.secretHint}>
                          Use this if scanning does not work.
                        </Text>
                      </View>

                      <Pressable
                        onPress={handleCopySecret}
                        style={({ pressed }) => [
                          styles.copyButton,
                          pressed && { opacity: 0.72 },
                        ]}
                      >
                        <Feather name="copy" size={13} color="#1e40af" />
                        <Text style={styles.copyText}>Copy</Text>
                      </Pressable>
                    </View>

                    <Text selectable numberOfLines={2} style={styles.secretText}>
                      {secret || "Setup key unavailable"}
                    </Text>
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>AUTHENTICATOR CODE</Text>

                    <View
                      style={[styles.inputBox, focused && styles.inputActive]}
                    >
                      <Feather
                        name="shield"
                        size={18}
                        color={focused ? "#1e40af" : "#94A3B8"}
                      />

                      <TextInput
                        value={otp}
                        onChangeText={(text) =>
                          setOtp(text.replace(/\D/g, "").slice(0, 6))
                        }
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        keyboardType={
                          Platform.OS === "ios" ? "number-pad" : "numeric"
                        }
                        textContentType="oneTimeCode"
                        autoComplete="sms-otp"
                        placeholder="000000"
                        placeholderTextColor="#94A3B8"
                        maxLength={6}
                        editable={!loadingVerify}
                        style={styles.input}
                        textAlign="center"
                      />
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.button,
                      pressed && { opacity: 0.94 },
                      (loadingVerify || otp.length !== 6) &&
                      styles.buttonDisabled,
                    ]}
                    onPress={handleVerify}
                    disabled={loadingVerify || otp.length !== 6}
                  >
                    <LinearGradient
                      colors={
                        loadingVerify || otp.length !== 6
                          ? ["#94A3B8", "#64748B"]
                          : ["#1e40af", "#1e3a8a"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonInner}
                    >
                      {loadingVerify ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>
                            Verify & Continue
                          </Text>

                          <View style={styles.btnArrow}>
                            <Feather
                              name="arrow-right"
                              size={14}
                              color="#1e40af"
                            />
                          </View>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && { opacity: 0.6 },
                ]}
                disabled={loadingVerify}
                onPress={handleCancel}
              >
                <Text style={styles.logoutText}>Cancel & Back to Login</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <RecoveryCodesModal
        visible={showRecoveryModal}
        codes={recoveryCodes}
        loading={false}
        onContinue={handleRecoveryCodesSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  keyboardView: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 140 },

  arcHeader: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    justifyContent: "center",
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.055)",
  },

  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabletCard: {
    maxWidth: 540,
    alignSelf: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 7,
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#EFF6FF",
    borderWidth: 5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: -54,
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 7,
    fontSize: 13.5,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
    fontWeight: "600",
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 44,
  },
  loadingText: {
    marginTop: 14,
    color: "#64748B",
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTextWrap: { flex: 1 },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
  },
  sectionSubtitle: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
  },
  qrOuterContainer: {
    alignItems: "center",
    marginBottom: 22,
  },
  qrWrapper: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  qrFallback: {
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  qrFallbackText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 13,
  },
  secretBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 15,
    marginBottom: 16,
  },
  secretHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  secretLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  secretHint: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  copyText: {
    color: "#1e40af",
    fontWeight: "800",
    fontSize: 12,
  },
  secretText: {
    color: "#0F172A",
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    lineHeight: 21,
  },
  inputWrapper: { marginBottom: 18 },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 7,
    marginLeft: 2,
  },
  inputBox: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  inputActive: {
    borderColor: "#1e40af",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    fontSize: 21,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: Platform.OS === "ios" ? 8 : 6,
    paddingLeft: Platform.OS === "ios" ? 8 : 0,
  },
  button: {
    borderRadius: 18,
    overflow: "hidden",
  },
  buttonDisabled: {
    opacity: 0.9,
  },
  buttonInner: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  btnArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButton: {
    marginTop: 16,
    alignItems: "center",
    padding: 8,
  },
  logoutText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 13,
  },
  topSafeArea: {
    backgroundColor: "#276bbd",
  },
});