import { useAuth } from "@/providers/auth-provider";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  async function handleReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Email Required", { description: "Enter your registered email." });
      return;
    }

    try {
      setLoading(true);
      Keyboard.dismiss();
      await sendPasswordReset(normalizedEmail);
      toast.success("OTP Sent", { description: "Check your inbox for the code." });
      
      router.push({
        pathname: "/verify-otp",
        params: { email: normalizedEmail },
      });
    } catch (error) {
      toast.error("Request Failed", { description: "Could not send reset code." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent />
        <LinearGradient colors={["#040D1A", "#0A192F", "#020617"]} style={StyleSheet.absoluteFill} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex1}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <SafeAreaView style={styles.container} edges={['top']}>
              
              {/* Logo Section */}
              <View style={styles.headerSection}>
                <View style={styles.logoGlassBackground}>
                  <Image source={logoImg} style={styles.logo} />
                </View>
                <Text style={styles.welcomeText}>Recovery</Text>
                <Text style={styles.brandSubtitle}>Secure Access for Adjusters</Text>
              </View>

              {/* Glass Card */}
              <View style={styles.glassCard}>
                <View style={styles.iconBadge}>
                  <MaterialCommunityIcons name="shield-sync-outline" size={32} color="#38BDF8" />
                </View>

                <Text style={styles.cardTitle}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Enter your email to receive a secure{"\n"}one-time password (OTP).
                </Text>

                <View style={styles.inputBox}>
                  <Text style={styles.label}>Registered Email</Text>
                  <View style={[
                    styles.inputWrapper,
                    isFocused && styles.inputWrapperActive
                  ]}>
                    <Ionicons name="mail-outline" size={20} color={isFocused ? "#38BDF8" : "#64748B"} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      placeholder="name@company.com"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      style={styles.input}
                      selectionColor="#38BDF8"
                      editable={!loading}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.actionBtn, loading && { opacity: 0.8 }]}
                  onPress={handleReset}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#38BDF8", "#1D4ED8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btnGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <View style={styles.btnContent}>
                        <Text style={styles.btnText}>SEND OTP</Text>
                        <Ionicons name="send-sharp" size={16} color="#FFF" />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.footer}>
                  <TouchableOpacity onPress={() => router.back()} disabled={loading}>
                    <Text style={styles.backLink}>Return to Login</Text>
                  </TouchableOpacity>
                </View>
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
  flex1: { flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: "center",
    paddingVertical: 40 
  },
  container: { paddingHorizontal: 22, alignItems: "center" },

  // Header
  headerSection: { alignItems: "center", marginBottom: 35 },
  logoGlassBackground: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 20,
  },
  logo: { width: width * 0.5, height: 40, resizeMode: "contain" },
  welcomeText: { fontSize: 26, fontWeight: "900", color: "#FFF", letterSpacing: -0.5 },
  brandSubtitle: { fontSize: 13, color: "#94A3B8", marginTop: 4, fontWeight: "500" },

  // Glass Card
  glassCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#FFF", marginBottom: 10, letterSpacing: 1 },
  subtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center", lineHeight: 20, marginBottom: 30 },

  // Input
  inputBox: { width: "100%", marginBottom: 25 },
  label: { fontSize: 10, fontWeight: "900", color: "#64748B", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 58,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  inputWrapperActive: { borderColor: "#38BDF8", backgroundColor: "rgba(56, 189, 248, 0.03)" },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: "#FFF", fontWeight: "600" },

  // Button
  actionBtn: { width: "100%", height: 58, borderRadius: 18, overflow: "hidden" },
  btnGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnText: { color: "#FFF", fontSize: 14, fontWeight: "900", letterSpacing: 1.5 },

  // Footer
  footer: { width: "100%", alignItems: "center", marginTop: 25 },
  backLink: { color: "#38BDF8", fontSize: 14, fontWeight: "800" },
});