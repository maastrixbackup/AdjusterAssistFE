import { useAuth } from "@/providers/auth-provider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

export default function VerifyOtpScreen() {
  const { verifyPasswordResetOtp } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();

  const emailFromParams = useMemo(() => {
    if (Array.isArray(params.email)) return params.email[0] ?? "";
    return params.email ?? "";
  }, [params.email]);

  const [email] = useState(emailFromParams.toLowerCase());
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  // Fix: Prevent initial screen flicker by handling StatusBar and initial focus
  useEffect(() => {
    if (Platform.OS === "android") {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor("transparent");
    }
    
    // Smooth transition: Focus first input after screen entry animation finishes
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    const char = value.slice(-1);
    newOtp[index] = char;
    setOtp(newOtp);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (char && index === 5) {
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  async function handleVerifyOtp() {
    const combinedOtp = otp.join("");
    if (combinedOtp.length < 6) {
      toast.error("Incomplete Code", { description: "Please enter all 6 digits." });
      return;
    }

    try {
      setLoading(true);
      await verifyPasswordResetOtp(email, combinedOtp);
      toast.success("Identity Verified");
      router.push({
        pathname: "/reset-password",
        params: { email, otp: combinedOtp, verified: "1" },
      });
    } catch (error: any) {
      toast.error("Verification Failed", { description: error.message || "Invalid OTP." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.root}>
        {/* Set to translucent to prevent "jump" on Android keyboard open */}
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <LinearGradient colors={["#040D1A", "#0A192F", "#020617"]} style={StyleSheet.absoluteFill} />

        <KeyboardAvoidingView
          // Use 'padding' for iOS and nothing/static height for Android to avoid flickering
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            <SafeAreaView style={styles.container}>
              
              <View style={styles.logoWrapper}>
                <View style={styles.logoGlassBackground}>
                  <Image source={logoImg} style={styles.logo} />
                </View>
                <View style={styles.logoGlow} />
              </View>

              <View style={styles.glassCard}>
                <View style={styles.iconBadge}>
                  <MaterialCommunityIcons name="shield-check" size={34} color="#38BDF8" />
                </View>

                <Text style={styles.title}>Verify Account</Text>
                <Text style={styles.subtitle}>
                  Enter the verification code sent to{"\n"}
                  <Text style={styles.emailHighlight}>{email || "your inbox"}</Text>
                </Text>

                <View style={styles.otpRow}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { inputRefs.current[index] = ref; }}
                      style={[
                        styles.otpBox,
                        digit ? styles.otpBoxActive : styles.otpBoxInactive
                      ]}
                      maxLength={1}
                      keyboardType="number-pad"
                      value={digit}
                      onChangeText={(val) => handleOtpChange(val, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      selectionColor="#38BDF8"
                      placeholder="-"
                      placeholderTextColor="rgba(255,255,255,0.1)"
                      // Fix: Remove standard underlining on some Android versions
                      underlineColorAndroid="transparent"
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#38BDF8", "#1D4ED8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.btnGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.btnText}>VERIFY OTP</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendTouch} onPress={() => router.back()}>
                  <Text style={styles.resendBase}>
                    Didn&apos;t receive it? <Text style={styles.resendBold}>Resend Code</Text>
                  </Text>
                </TouchableOpacity>
              </View>
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
    // justifyContent: "center", // Remove to prevent vertical centering which causes issues on Android when keyboard opens
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 40 
  },
  container: { paddingHorizontal: 22, alignItems: "center" },

  logoWrapper: {
    marginBottom: 50,
    alignItems: "center",
    justifyContent: "center",
  },
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
  logo: {
    width: width * 0.55,
    height: 48,
    resizeMode: "contain",
  },

  glassCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 35,
    paddingHorizontal: 20,
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
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 35,
  },
  emailHighlight: { color: "#38BDF8", fontWeight: "800" },

  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 40,
  },
  otpBox: {
    width: (width - 110) / 6,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  otpBoxInactive: { borderColor: "rgba(255, 255, 255, 0.1)" },
  otpBoxActive: { borderColor: "#38BDF8", backgroundColor: "rgba(56, 189, 248, 0.08)" },

  submitBtn: {
    width: "100%",
    height: 60,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
  },
  btnGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },
  resendTouch: { marginTop: 30 },
  resendBase: { color: "#64748B", fontSize: 14 },
  resendBold: { color: "#38BDF8", fontWeight: "900" },
});