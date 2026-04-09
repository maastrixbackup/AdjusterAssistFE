import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { StatusBar } from "expo-status-bar";
import { toast } from "sonner-native";

import { useAuth } from "@/providers/auth-provider";

export default function VerifyOtpScreen() {
  const { width } = useWindowDimensions();
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
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"error" | "success" | null>(null);

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  async function handleVerifyOtp() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();
    setStatusMessage("");
    setStatusType(null);

    if (!normalizedEmail || !normalizedOtp) {
      setStatusType("error");
      setStatusMessage("Please enter both your email and OTP.");
      toast.error("Required Fields", {
        description: "Please enter both your email and OTP.",
      });
      return;
    }

    try {
      setLoading(true);
      await verifyPasswordResetOtp(normalizedEmail, normalizedOtp);
      setStatusType("success");
      setStatusMessage("OTP verified successfully.");
      toast.success("OTP verified", {
        description: "Now set your new password.",
         style: { borderRadius: 8, backgroundColor: "#D1FAE5",  },
      });
      router.push({
        pathname: "/reset-password",
        params: { email: normalizedEmail, otp: normalizedOtp, verified: "1" },
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Invalid OTP. Please try again.";
      setStatusType("error");
      setStatusMessage(message);
      toast.error("Verification failed", {
        description: message,
         style: { borderRadius: 8, backgroundColor: "#1411be" },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={["#1E63B6", "#052146"]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <SafeAreaView style={styles.safe}>
            <View style={styles.contentWrapper}>

              {/* 🔥 HEADER (MATCH LOGIN) */}
              <View style={styles.header}>
                <Image
                  source={logoImg}
                  style={[
                    styles.logo,
                    { width: isTablet ? 240 : width * 0.5 },
                  ]}
                />
                {/* <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>
                  Enter the OTP sent to your email
                </Text> */}
              </View>

              {/* 🔥 CARD */}
              <View style={styles.center}>
                <View style={[styles.card, isTablet && { padding: 32 }]}>
    <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>
              Enter the OTP received on your registered email address.
            </Text>
                  {/* ICON */}
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons
                      name="shield-key-outline"
                      size={28}
                      color="#1E63B6"
                    />
                  </View>

                  {/* EMAIL */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Registered Email</Text>
                    <View style={styles.inputBox}>
                      <Ionicons name="mail-outline" size={18} color="#94A3B8" />
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        autoCapitalize="none"
                        placeholder="Email"
                      />
                    </View>
                  </View>

                  {/* OTP */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>OTP</Text>
                    <View style={styles.inputBox}>
                      <Ionicons name="key-outline" size={18} color="#94A3B8" />
                      <TextInput
                        value={otp}
                        onChangeText={setOtp}
                        style={styles.input}
                        keyboardType="number-pad"
                        placeholder="Enter OTP"
                      />
                    </View>
                     {!!statusMessage && (
                <Text
                  style={[
                    styles.statusText,
                    statusType === "error"
                      ? styles.statusError
                      : styles.statusSuccess,
                  ]}
                >
                  {statusMessage}
                </Text>
              )}
                  </View>

                  {/* BUTTON */}
                  <TouchableOpacity style={styles.button} onPress={handleVerifyOtp}>
                    <LinearGradient
                      colors={["#276bbd", "#0B3C7A"]}
                      style={styles.btnInner}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnText}>Verify OTP</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* BACK */}
                  <TouchableOpacity
                    onPress={() => router.replace("/forgot-password")}
                    style={styles.footer}
                  >
                    <Text style={styles.link}>Back to Forgot Password</Text>
                  </TouchableOpacity>

                </View>
              </View>

            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  safe: { flex: 1 },

  contentWrapper: {
    flex: 1,
    justifyContent: "center",
  },

  header: {
    alignItems: "center",
    marginBottom: 30,
  },

  logo: {
    height: 50,
    resizeMode: "contain",
    marginBottom: 10,
  },

  title: {
    fontSize: 24,
    color: "#000",
    fontWeight: "700",
    textAlign: "center",
  },

  subtitle: {
    color: "rgba(0,0,0,0.7)",
    fontSize: 14,
    textAlign: "center",
  },

  center: {
    width: "100%",
    alignItems: "center",
  },

  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
  },

  iconCircle: {
    position: "absolute",
    top: -45,
    alignSelf: "center",
    width: 65,
    height: 65,
    borderRadius: 40,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "#F8FAFC",
  },

  inputContainer: {
    marginTop: 20,
    marginBottom: 10,
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
  },

  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    height: 50,
  },

  input: {
    flex: 1,
    marginLeft: 10,
  },

  button: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
  },

  btnInner: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },

  btnText: {
    color: "#FFF",
    fontWeight: "700",
  },

  footer: {
    marginTop: 16,
    alignItems: "center",
  },

  link: {
    color: "#276bbd",
    fontWeight: "700",
  },
   statusText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  statusError: {
    color: "#DC2626",
  },
  statusSuccess: {
    color: "#16A34A",
  },
});