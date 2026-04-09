import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { useAuth } from "@/providers/auth-provider";

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const params = useLocalSearchParams<{
    email?: string;
    otp?: string;
    verified?: string;
  }>();

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

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  async function handleResetPassword() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    if (!verified || !normalizedEmail || !normalizedOtp) {
      toast.error("Session Expired", {
        description: "Please verify OTP again before resetting your password.",
        style: { borderRadius: 8, backgroundColor: "#1411be" },
      });
      router.replace({
        pathname: "/verify-otp",
        params: normalizedEmail ? { email: normalizedEmail } : undefined,
      });
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error("Required Fields", {
        description: "Please enter and confirm your new password.",
        style: { borderRadius: 8, backgroundColor: "#1411be" },
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Password Mismatch", {
        description: "New Password and Re-enter Password must match.",
        style: { borderRadius: 8, backgroundColor: "#1411be" },
      });
      return;
    }

    try {
      setLoading(true);
      await toast.promise(
        resetPassword(normalizedEmail, normalizedOtp, newPassword),
        {
          loading: "Updating your password...",
          success: () => {
            setTimeout(() => router.replace("/login"), 1500);
            return "Password updated! Redirecting...";
          },
          error: (err) =>
            err instanceof Error ? err.message : "Unable to reset password",
        },
      );
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
            <View style={styles.header}>
              <Image source={logoImg} style={styles.logo} />
           
            </View>
            <View style={styles.center}>
              <View style={styles.card}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="shield-lock-outline"
                    size={28}
                    color="#1E63B6"
                  />
                </View>
                <Text style={styles.title}>Set New Password</Text>
                <Text style={styles.subtitle}>
                  OTP is verified internally. Set your new password to complete reset.
                </Text>

                {/* PASSWORD */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputBox}>
                    <Feather name="lock" size={18} color="#94A3B8" />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      style={styles.input}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* CONFIRM */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Re-enter Password</Text>
                  <View style={styles.inputBox}>
                    <Feather name="lock" size={18} color="#94A3B8" />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      style={styles.input}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={18} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* BUTTON */}
                <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
                  <LinearGradient
                    colors={["#276bbd", "#0B3C7A"]}
                    style={styles.btnInner}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.btnText}>Update Password</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* BACK */}
                <TouchableOpacity
                  onPress={() =>
                    router.replace({
                      pathname: "/verify-otp",
                      params: email ? { email } : undefined,
                    })
                  }
                  style={styles.footer}
                >
                  <Text style={styles.link}>Back to OTP Verification</Text>
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

  headerTitle: {
    fontSize: 24,
    color: "#FFF",
    fontWeight: "700",
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
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
    top: -30,
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

  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
  },

  subtitle: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 13,
    marginBottom: 16,
  },

  inputContainer: {
    marginBottom: 14,
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
});

