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

export default function VerifyOtpScreen() {
  const { verifyPasswordResetOtp } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const emailFromParams = useMemo(() => {
    if (Array.isArray(params.email)) return params.email[0] ?? "";
    return params.email ?? "";
  }, [params.email]);

  const [email, setEmail] = useState(emailFromParams.toLowerCase());
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  async function handleVerifyOtp() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    if (!normalizedEmail || !normalizedOtp) {
      toast.error("Required Fields", {
        description: "Please enter both your email and OTP.",
      });
      return;
    }

    try {
      setLoading(true);
      await verifyPasswordResetOtp(normalizedEmail, normalizedOtp);
      toast.success("OTP verified", {
        description: "Now set your new password.",
      });
      router.push({
        pathname: "/reset-password",
        params: { email: normalizedEmail, otp: normalizedOtp, verified: "1" },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#052146" />
      <LinearGradient
        colors={["#1E63B6", "#052146"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <Image source={logoImg} style={styles.logo} />
      </SafeAreaView>

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
                name="shield-key-outline"
                size={32}
                color="#1E63B6"
              />
            </View>

            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>
              Enter the OTP received on your registered email address.
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
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>OTP</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#94A3B8" />
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor="#CBD5E1"
                  style={styles.input}
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleVerifyOtp}
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
                    <Text style={styles.buttonText}>Verify OTP</Text>
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
              onPress={() => router.replace("/forgot-password")}
              style={styles.backButton}
            >
              <Text style={styles.backText}>Back to Forgot Password</Text>
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
    backgroundColor: "#052146",
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
    marginTop: 40,
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
