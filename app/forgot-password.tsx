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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { useAuth } from "@/providers/auth-provider";

export default function ForgotPasswordScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

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
          style: { borderRadius: 8, backgroundColor: "#1411be" },
      });

      router.push({
        pathname: "/verify-otp",
        params: { email: normalizedEmail },
      });
    } catch {
      toast.error("Unable to send OTP", {
        description: "Please try again later.",
          style: { borderRadius: 8, backgroundColor: "#1411be" },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* SAME BACKGROUND */}
      <LinearGradient
        colors={["#1E63B6", "#052146"]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <SafeAreaView style={styles.safe}>
            <View style={styles.contentWrapper}>
              <View style={styles.header}>
                <Image
                  source={logoImg}
                  style={[
                    styles.logo,
                    { width: isTablet ? 240 : width * 0.5 },
                  ]}
                />
             
              </View>
              <View style={styles.center}>
                <View style={[styles.card, isTablet && { padding: 32 }]}>

                  {/* ICON (kept same) */}
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons
                      name="email-fast-outline"
                      size={28}
                      color="#1E63B6"
                    />
                  </View>
                <View>
                     <Text style={styles.title}>Password Recovery</Text>
                <Text style={styles.subtitle}>
                 Enter your email to receive OTP for password reset.
                </Text>
                </View>
                  {/* EMAIL */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Registered Email</Text>

                    <View style={styles.inputBox}>
                      <Ionicons
                        name="mail-outline"
                        size={18}
                        color="#94A3B8"
                      />
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

                  {/* BUTTON */}
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleReset}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={["#276bbd", "#0B3C7A"]}
                      style={styles.buttonInner}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Send OTP</Text>
                          <Ionicons
                            name="send"
                            size={16}
                            color="#FFF"
                            style={{ marginLeft: 8 }}
                          />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* FOOTER */}
                  <View style={styles.footerLinks}>
                    <TouchableOpacity onPress={() => router.replace("/login")}>
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
    marginBottom: 0,
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
    top: -40,
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
    marginBottom: 16,
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
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
  },

  buttonInner: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  buttonText: {
    color: "#FFF",
    fontWeight: "700",
  },

  footerLinks: {
    marginTop: 18,
    alignItems: "center",
  },

  backText: {
    color: "#64748B",
    fontWeight: "700",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 16,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  dividerText: {
    marginHorizontal: 10,
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "800",
  },

  tokenButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },

  tokenText: {
    color: "#1E63B6",
    fontWeight: "800",
    marginRight: 6,
  },
});