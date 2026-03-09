import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/providers/auth-provider";

const fontRegular = "Roboto";
const fontMedium = "Roboto-Medium";
const fontBold = "Roboto-Bold";

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const logoImg = require("../assets/images/AdjusterAssist1.png");
  const abstractImg = require("../assets/images/abstract1.png");

  async function handleResetPassword() {
    if (!token.trim() || !newPassword.trim()) {
      setMessage("Token and new password are required.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await resetPassword(token.trim(), newPassword);
      setMessage("Password reset successful. Please login.");
      router.replace("/login");
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Unable to reset password";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaProvider>
      <LinearGradient
        colors={["#1E63B6", "#052146"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView edges={["top"]} style={styles.safe}>
          <LinearGradient
            colors={["#1E63B6", "#052146"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <Image source={abstractImg} style={styles.molecule} />
            <View style={styles.logoContainer}>
              <Image source={logoImg} style={styles.logo} />
            </View>
          </LinearGradient>

          <View style={styles.container}>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Paste the token from email and enter a new password.
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={20} color="#9CA3AF" />
              <TextInput
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Reset Token"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Feather name="lock" size={20} color="#9CA3AF" />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="New Password"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <TouchableOpacity
              style={styles.button}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <LinearGradient
                colors={["#092f61", "#1E63B6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={styles.link}>Back to login</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    height: 110,
    justifyContent: "center",
    overflow: "hidden",
  },
  molecule: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 220,
    height: 120,
    resizeMode: "cover",
    opacity: 0.25,
  },
  logoContainer: {
    paddingLeft: 24,
  },
  logo: {
    width: 220,
    resizeMode: "contain",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginTop: -8,
    padding: 18,
    paddingTop: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
    fontFamily: fontBold,
  },
  subtitle: {
    textAlign: "center",
    color: "#6B7280",
    marginVertical: 10,
    fontSize: 14,
    fontFamily: fontRegular,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3E8EF",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#111827",
    fontFamily: fontRegular,
  },
  message: {
    marginTop: 10,
    textAlign: "center",
    color: "#334155",
    fontFamily: fontMedium,
  },
  button: {
    marginTop: 24,
  },
  buttonGradient: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: fontMedium,
  },
  link: {
    marginTop: 16,
    color: "#0B5ED7",
    textAlign: "center",
    fontSize: 14,
    fontFamily: fontMedium,
  },
});
