import { challengeMFALogin, verifyMFALogin } from "@/lib/services/mfaService";
import { useAuth } from "@/providers/auth-provider";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
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

export default function MFALoginScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width > 768;

  const { mfaTempSession, completeMfaLogin, logout } = useAuth();

  const [challengeId, setChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [focused, setFocused] = useState(false);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

  const logoImg = require("../../assets/images/AdjusterAssist1.png");

  useEffect(() => {
    if (!mfaTempSession || !mfaTempSession.factor_id) {
      router.replace("/login");
      return;
    }

    handleChallenge();
  }, []);

  async function handleChallenge() {
    if (!mfaTempSession?.factor_id) return;

    try {
      setLoadingChallenge(true);

      const data = await challengeMFALogin({
        factor_id: mfaTempSession.factor_id,
        temp_access_token: mfaTempSession.temp_access_token,
        temp_refresh_token: mfaTempSession.temp_refresh_token,
      });

      setChallengeId(data.challenge_id);
    } catch (error: any) {
        console.log(error)
      toast.error("MFA Challenge Failed", {
        description: error?.message || "Unable to start MFA verification.",
      });
    } finally {
      setLoadingChallenge(false);
    }
  }

  async function handleVerify() {
    if (!mfaTempSession?.factor_id) return;

    const code = otp.trim();

    if (!challengeId || code.length !== 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error("Invalid Code", {
        description: "Enter the 6-digit code from your authenticator app.",
      });
      return;
    }

    try {
      setLoadingVerify(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const session = await verifyMFALogin({
        factor_id: mfaTempSession.factor_id,
        challenge_id: challengeId,
        code,
        temp_access_token: mfaTempSession.temp_access_token,
        temp_refresh_token: mfaTempSession.temp_refresh_token,
      });

      await completeMfaLogin(session);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      toast.success("Verified", {
        description: "Welcome back.",
      });

      router.replace("/(tabs)");
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      toast.error("Verification Failed", {
        description: error?.message || "Invalid authentication code.",
      });
    } finally {
      setLoadingVerify(false);
    }
  }

  const logoStyle = {
    height: 50,
    width: isTablet ? 240 : width * 0.5,
    resizeMode: "contain" as const,
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
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.arcHeader, { height: Math.max(220, height * 0.32) }]}>
            <LinearGradient
              colors={["#276bbd", "#1e40af", "#172554"]}
              style={StyleSheet.absoluteFill}
            />

            <View style={[styles.bubble, { top: -40, right: -40, width: 200, height: 200 }]} />
            <View style={[styles.bubble, { bottom: -30, left: -30, width: 130, height: 130 }]} />

            <SafeAreaView style={styles.headerContent}>
              <View style={styles.logoContainer}>
                <Image source={logoImg} style={logoStyle} />
              </View>

              <Text style={styles.arcTitle}>MFA Verification</Text>
              <Text style={styles.arcSub}>Enter your authenticator code</Text>
            </SafeAreaView>
          </View>

          <View style={[styles.body, { marginTop: -50 }]}>
            <View style={[styles.card, isTablet && styles.tabletCard]}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={34}
                  color="#1e40af"
                />
              </View>

              <Text style={styles.title}>Verify Login</Text>

              <Text style={styles.subtitle}>
                Open your authenticator app and enter the 6-digit code to continue.
              </Text>

              {loadingChallenge ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color="#1e40af" />
                  <Text style={styles.loadingText}>Starting secure verification...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>AUTHENTICATOR CODE</Text>
                    <View style={[styles.inputBox, focused && styles.inputActive]}>
                      <Feather
                        name="lock"
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
                        keyboardType="number-pad"
                        placeholder="123456"
                        placeholderTextColor="#94A3B8"
                        maxLength={6}
                        style={styles.input}
                      />
                    </View>
                  </View>

                  <Pressable
                    style={styles.button}
                    onPress={handleVerify}
                    disabled={loadingVerify}
                  >
                    <LinearGradient
                      colors={["#1e40af", "#1e3a8a"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonInner}
                    >
                      {loadingVerify ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Verify & Sign In</Text>
                          <View style={styles.btnArrow}>
                            <Feather name="arrow-right" size={16} color="#1e40af" />
                          </View>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>

                  <Pressable
                    style={styles.retryButton}
                    onPress={handleChallenge}
                    disabled={loadingChallenge}
                  >
                    <Text style={styles.retryText}>Restart Verification</Text>
                  </Pressable>
                </>
              )}

              <Pressable
                style={styles.logoutButton}
                onPress={() => {
                  logout();
                  router.replace("/login");
                }}
              >
                <Text style={styles.logoutText}>Back to Login</Text>
              </Pressable>
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
  arcHeader: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
    justifyContent: "center",
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerContent: {
    paddingHorizontal: 30,
    alignItems: "center",
  },
  logoContainer: {
    marginBottom: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  arcTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  arcSub: {
    marginTop: 6,
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  tabletCard: {
    maxWidth: 500,
    alignSelf: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 24,
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#EFF6FF",
    borderWidth: 6,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: -62,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  inputWrapper: { marginBottom: 18 },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputBox: {
    height: 58,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inputActive: {
    borderColor: "#1e40af",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 4,
  },
  button: {
    borderRadius: 20,
    overflow: "hidden",
  },
  buttonInner: {
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  btnArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    marginTop: 18,
    alignItems: "center",
    padding: 8,
  },
  retryText: {
    color: "#1e40af",
    fontWeight: "800",
    fontSize: 14,
  },
  logoutButton: {
    marginTop: 12,
    alignItems: "center",
    padding: 8,
  },
  logoutText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 14,
  },
});