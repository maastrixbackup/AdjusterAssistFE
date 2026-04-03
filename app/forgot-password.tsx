import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  async function handleReset() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Email Required", {
        description: "Please enter your email address to continue.",
      });
      return;
    }

    try {
      setLoading(true);
      await sendPasswordReset(normalizedEmail);
      toast.success("OTP sent to your email", {
        description: "Use the OTP to verify and set a new password.",
      });
      router.push({
        pathname: "/verify-otp",
        params: { email: normalizedEmail },
      });
    } catch (error) {
      console.log(error);
      toast.error("Unable to send OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* 🔥 Fix 1: Status bar styling */}
      <StatusBar barStyle="light-content" backgroundColor="#052146" />

      {/* 🔥 Fix 2: Full background gradient */}
      <LinearGradient
        colors={["#1E63B6", "#052146"]}
        style={StyleSheet.absoluteFill}
      />

      {/* 🔥 Header */}
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <Image source={logoImg} style={styles.logo} />
      </SafeAreaView>

      {/* 🔥 Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name="email-fast-outline"
                size={32}
                color="#1E63B6"
              />
            </View>

            <Text style={styles.title}>Recovery</Text>
            <Text style={styles.subtitle}>
              Enter your email and we&apos;ll send a one-time password (OTP) for secure reset.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Registered Email</Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#94A3B8" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="name@company.com"
                  placeholderTextColor="#CBD5E1"
                  style={styles.input}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#276bbd", "#0B3C7A"]}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      Send OTP
                    </Text>
                    <Ionicons
                      name="send"
                      size={16}
                      color="#FFF"
                      style={{ marginLeft: 10 }}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footerLinks}>
              <TouchableOpacity
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.backText}>Back to Login</Text>
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                onPress={() => router.push("/verify-otp")}
                style={styles.tokenButton}
              >
                <Text style={styles.tokenText}>
                  I already have an OTP
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#1E63B6"
                />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#052146", // 🔥 critical
  },

  headerSafe: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 20,
  },

  logo: {
    width: 220,
    height: 60,
    resizeMode: "contain",
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    paddingTop: 48,
    marginTop: 40,

    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
      },
      android: { elevation: 8 },
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
    borderWidth: 6,
    borderColor: "#F8FAFC",
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    color: "#0F172A",
    marginBottom: 8,
  },

  subtitle: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 28,
  },

  inputContainer: { marginBottom: 24 },

  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 58,
  },

  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "600",
  },

  button: { marginTop: 8 },

  buttonGradient: {
    height: 60,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  footerLinks: {
    marginTop: 24,
    alignItems: "center",
  },

  backText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  dividerText: {
    marginHorizontal: 12,
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
  },

  tokenButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },

  tokenText: {
    color: "#1E63B6",
    fontSize: 14,
    fontWeight: "800",
  },
});
