import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  async function handleResetPassword() {
    if (!token.trim() || !newPassword.trim()) {
      toast.error("Required Fields", {
        description:
          "Please enter both the reset token and your new password.",
      });
      return;
    }

    try {
      setLoading(true);

      await toast.promise(resetPassword(token.trim(), newPassword), {
        loading: "Updating your password...",
        success: () => {
          setTimeout(() => router.replace("/login"), 1500);
          return "Password updated! Redirecting...";
        },
        error: (err) =>
          err instanceof Error
            ? err.message
            : "Unable to reset password",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* ✅ Status bar fix */}
      <StatusBar barStyle="light-content" backgroundColor="#052146" />

      {/* ✅ Full-screen gradient (critical fix) */}
      <LinearGradient
        colors={["#1E63B6", "#052146"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <Image source={logoImg} style={styles.logo} />
      </SafeAreaView>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={32}
                color="#1E63B6"
              />
            </View>

            <Text style={styles.title}>Secure Reset</Text>
            <Text style={styles.subtitle}>
              Enter the verification token sent to your email and choose a strong new password.
            </Text>

            {/* TOKEN */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Reset Token</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#94A3B8" />
                <TextInput
                  value={token}
                  onChangeText={setToken}
                  placeholder="Paste token here..."
                  placeholderTextColor="#CBD5E1"
                  style={styles.input}
                />
              </View>
            </View>

            {/* PASSWORD */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={20} color="#94A3B8" />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#CBD5E1"
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* BUTTON */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <LinearGradient
                colors={["#276bbd", "#0B3C7A"]}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      Update Password
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFF"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/login")}
              style={styles.backButton}
            >
              <Text style={styles.backText}>Return to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#052146", // 🔥 must match gradient end
  },

  headerSafe: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 10,
  },

  logo: {
    width: 200,
    height: 50,
    resizeMode: "contain",
  },

  keyboardView: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    paddingTop: 40,
    marginTop: 40, // ✅ no negative margin

    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },

  iconCircle: {
    position: "absolute",
    top: -35,
    alignSelf: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#F8FAFC",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    color: "#1E293B",
    marginBottom: 8,
  },

  subtitle: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },

  inputContainer: { marginBottom: 20 },

  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    textTransform: "uppercase",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },

  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#1E293B",
  },

  button: { marginTop: 10 },

  buttonGradient: {
    height: 58,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  backButton: {
    marginTop: 20,
    alignSelf: "center",
  },

  backText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
});