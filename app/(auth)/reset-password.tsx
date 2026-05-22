import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
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
import { toast } from "sonner-native";

export default function ResetPasswordScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width > 768;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const logoImg = require("../../assets/images/AdjusterAssist1.png");
  const deepLinkUrl = Linking.useURL();

  useEffect(() => {
    if (!deepLinkUrl) return;
    console.log("Raw Incoming Deep Link URL:", deepLinkUrl);

    try {
      // Unify parsing for hash segments (#) or query strings (?)
      const urlParts = deepLinkUrl.split("#")[1] || deepLinkUrl.split("?")[1];
      
      if (urlParts) {
        const urlParams = new URLSearchParams(urlParts);
        
        // 1. Check for explicit error fields sent back by Supabase
        const errorCode = urlParams.get("error_code");
        const errorDescription = urlParams.get("error_description");

        if (errorCode === "otp_expired" || errorCode === "access_denied") {
          const cleanMessage = errorDescription 
            ? errorDescription.replace(/\+/g, " ") 
            : "This recovery link is invalid or has expired.";

          toast.error("Link Expired", {
            description: `${cleanMessage} Please request a new reset email.`,
          });

          // Guide them back automatically to generate a fresh request link
          setTimeout(() => {
            router.replace("/forgot-password");
          }, 2500);
          return;
        }

        // 2. Extract authorization payload token fields
        const token = urlParams.get("access_token") || urlParams.get("token");

        if (token) {
          setAccessToken(token);
          console.log("Token Successfully Prepared for Backend Transfer:", token.substring(0, 8) + "...");
        } else {
          toast.error("Invalid Link Structure", {
            description: "Could not find an access_token or token parameter in this link.",
          });
        }
      } else {
        toast.error("Invalid Link", {
          description: "This recovery link is missing routing parameter tokens.",
        });
      }
    } catch (err) {
      console.error("Deep Link Parsing Error:", err);
      toast.error("Parsing Error", {
        description: "Failed to extract security tokens from the link application context.",
      });
    }
  }, [deepLinkUrl]);

  const validatePassword = (pass: string) => {
    const hasNumber = /\d/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const hasMinLength = pass.length >= 8;

    if (!hasMinLength) return "Password must be at least 8 characters long.";
    if (!hasNumber) return "Password must contain at least one number.";
    if (!hasSpecial) return "Password must contain at least one special character.";
    return null;
  };

  async function handleResetPassword() {
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error("Weak Password", { description: passwordError });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Password Mismatch", { description: "Passwords do not match." });
      return;
    }
    if (!accessToken) {
      toast.error("Session Expired", { 
        description: "Missing secure authentication session context. Please request a new email link." 
      });
      return;
    }

    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const response = await fetch("https://adjusterassist-backend.onrender.com/api/v1/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword: newPassword,
          accessToken: accessToken,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed changing credentials.");
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Password updated successfully.");
      
      setTimeout(() => {
        router.replace("/login");
      }, 1500);

    } catch (error: any) {
      toast.error("Reset Failed", {
        description: error.message || "Unable to update password.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={[styles.arcHeader, { height: height * 0.32 }]}>
            <LinearGradient colors={["#276bbd", "#1e40af", "#172554"]} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={styles.headerContent}>
              <View style={styles.logoContainer}>
                <Image source={logoImg} style={[styles.logo, { width: isTablet ? 240 : width * 0.45 }]} />
              </View>
              <Text style={styles.arcTitle}>New Password</Text>
              <Text style={styles.arcSub}>Secure your account with a strong password</Text>
            </SafeAreaView>
          </View>

          {/* Input Fields Card */}
          <View style={[styles.body, { marginTop: -40 }]}>
            <View style={[styles.card, isTablet && { maxWidth: 450, alignSelf: 'center' }]}>

              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="lock-reset" size={32} color="#1e40af" />
              </View>

              <View style={styles.textGroup}>
                <Text style={styles.title}>Update Password</Text>
                <Text style={styles.subtitle}>Create a new password to regain access.</Text>
              </View>

              {/* NEW PASSWORD */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                <View style={[styles.inputBox, focusedField === 'new' && styles.inputActive]}>
                  <Feather name="lock" size={18} color={focusedField === 'new' ? "#1e40af" : "#94A3B8"} />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    onFocus={() => setFocusedField('new')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    placeholder="Min. 8 characters"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* CONFIRM PASSWORD */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                <View style={[styles.inputBox, focusedField === 'confirm' && styles.inputActive]}>
                  <Feather name="shield" size={18} color={focusedField === 'confirm' ? "#1e40af" : "#94A3B8"} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Repeat password"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading || !accessToken} activeOpacity={0.8}>
                <LinearGradient colors={loading || !accessToken ? ["#94a3b8", "#64748b"] : ["#1e40af", "#1e3a8a"]} style={styles.buttonInner}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Save Password</Text>}
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.footer}>
                <TouchableOpacity onPress={() => router.replace("/login")}>
                  <Text style={styles.backText}>Back to Login</Text>
                </TouchableOpacity>
              </View>

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
  arcHeader: { borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: "hidden", justifyContent: 'center' },
  headerContent: { paddingHorizontal: 30, alignItems: 'center' },
  logoContainer: { marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 20 },
  logo: { height: 40, resizeMode: "contain" },
  arcTitle: { fontSize: 26, fontWeight: "800", color: "#fff" },
  arcSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4, textAlign: 'center' },
  body: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  card: { width: "100%", backgroundColor: "#FFF", borderRadius: 30, padding: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 15, elevation: 5 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#F0F4FF", justifyContent: "center", alignItems: "center", alignSelf: "center", marginTop: -60, borderWidth: 6, borderColor: "#FFF" },
  textGroup: { marginTop: 15, marginBottom: 25, alignItems: 'center' },
  title: { fontSize: 22, color: "#0F172A", fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 8 },
  inputWrapper: { marginBottom: 16 },
  inputLabel: { fontSize: 10, fontWeight: "800", color: "#94A3B8", letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  inputBox: { flexDirection: "row", alignItems: "center", borderRadius: 16, backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#F1F5F9", paddingHorizontal: 16, height: 56 },
  inputActive: { borderColor: "#1e40af", backgroundColor: "#FFF" },
  input: { flex: 1, marginLeft: 12, color: "#0F172A", fontSize: 15 },
  eyeBtn: { padding: 4 },
  button: { borderRadius: 18, overflow: "hidden", marginTop: 10 },
  buttonInner: { height: 60, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 12 },
  buttonText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  footer: { marginTop: 25, alignItems: "center" },
  backText: { color: "#1e40af", fontWeight: "700", fontSize: 14 },
});