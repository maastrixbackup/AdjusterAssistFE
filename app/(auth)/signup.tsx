import { useAuth } from "@/providers/auth-provider";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

type RoleType = "pa" | "ca";

export default function SignupScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width > 768;

  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleType>("ca");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoImg = require("../../assets/images/AdjusterAssist1.png");

  const validatePassword = (pass: string) => {
    const hasNumber = /\d/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const hasMinLength = pass.length >= 8;

    if (!hasMinLength) return "Password must be at least 8 characters.";
    if (!hasNumber) return "Include at least one number.";
    if (!hasSpecial) return "Include one special character.";
    return null;
  };

  async function handleSignup() {
    if (!name || !email || !password || !confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error("Required Fields", { description: "Please fill in all details." });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    toast.promise(signup(name, email, role, password), {
      loading: "Creating account...",
      success: () => {
        setTimeout(() => router.replace("/login"), 1500);
        return "Account created! Redirecting...";
      },
      error: () => {
        setLoading(false);
        return "Signup failed. Try again.";
      },
    });
  }

  const logoStyle = {
    height: 50,
    width: isTablet ? 240 : width * 0.5,
    resizeMode: "contain" as const,
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ══ ARC HEADER ══════════════════════════════════════════ */}
          <View style={[styles.arcHeader, { height: height * 0.3 }]}>
            <LinearGradient colors={["#276bbd", "#1e40af", "#172554"]} style={StyleSheet.absoluteFill} />
            
            <View style={[styles.bubble, { top: -30, right: -30, width: 180, height: 180 }]} />
            
            <SafeAreaView style={styles.headerContent}>
              <View style={styles.logoContainer}>
                <Image source={logoImg} style={logoStyle} />
              </View>
              <Text style={styles.arcTitle}>Create Account</Text>
              <Text style={styles.arcSub}>Join the professional adjuster network</Text>
            </SafeAreaView>
          </View>

          {/* ══ FORM BODY ════════════════════════════════════════════════ */}
          <View style={[styles.body, { marginTop: -40 }]}>
            <View style={[styles.card, isTablet && { maxWidth: 500, alignSelf: 'center' }]}>
              
              {/* ROLE SELECTION */}
              <Text style={styles.fieldLabel}>I AM A...</Text>
              <View style={styles.roleRow}>
                {[
                  { id: "ca", label: "Licensed Adjuster", icon: "briefcase" },
                  { id: "pa", label: "Public Adjuster", icon: "users" }
                ].map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRole(item.id as RoleType);
                    }}
                    style={[styles.roleButton, role === item.id && styles.roleActive]}
                  >
                    <Feather name={item.icon as any} size={14} color={role === item.id ? "#fff" : "#64748B"} />
                    <Text style={[styles.roleText, role === item.id && styles.roleTextActive]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* INPUT FIELDS */}
              <View style={styles.inputWrapper}>
                <Text style={styles.fieldLabel}>FULL NAME</Text>
                <View style={[styles.inputBox, focused === "name" && styles.inputActive]}>
                  <Feather name="user" size={18} color={focused === "name" ? "#276bbd" : "#94A3B8"} />
                  <TextInput
                    placeholder="John Doe"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocused("name")}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.fieldLabel}>WORK EMAIL</Text>
                <View style={[styles.inputBox, focused === "email" && styles.inputActive]}>
                  <Feather name="mail" size={18} color={focused === "email" ? "#276bbd" : "#94A3B8"} />
                  <TextInput
                    placeholder="john@company.com"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <View style={[styles.inputBox, focused === "pass" && styles.inputActive]}>
                  <Feather name="lock" size={18} color={focused === "pass" ? "#276bbd" : "#94A3B8"} />
                  <TextInput
                    placeholder="At least 8 characters"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused("pass")}
                    onBlur={() => setFocused(null)}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94A3B8" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                <View style={[styles.inputBox, focused === "confirm" && styles.inputActive]}>
                  <Feather name="lock" size={18} color={focused === "confirm" ? "#276bbd" : "#94A3B8"} />
                  <TextInput
                    placeholder="Repeat password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setFocused("confirm")}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Pressable 
                style={({ pressed }) => [styles.button, pressed && { transform: [{ scale: 0.98 }] }]} 
                onPress={handleSignup} 
                disabled={loading}
              >
                <LinearGradient colors={["#1e40af", "#1e3a8a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnInner}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.btnText}>Create Account</Text>
                      <View style={styles.btnArrow}><Feather name="check" size={16} color="#1e40af" /></View>
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Pressable onPress={() => router.push("/login")}>
                  <Text style={styles.link}>Sign In</Text>
                </Pressable>
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { flexGrow: 1 },
  
  // Header
  arcHeader: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
    justifyContent: 'center',
  },
  bubble: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },
  headerContent: { paddingHorizontal: 30, alignItems: 'center' },
  logoContainer: {
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  arcTitle: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: 4 },
  arcSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: 'center' },

  // Form Body
  body: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  fieldLabel: { fontSize: 10, fontWeight: "800", color: "#94A3B8", letterSpacing: 1, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
  
  // Role Selector
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  roleButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  roleActive: { backgroundColor: "#2d4cb1", borderColor: "#1e40af" },
  roleText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  roleTextActive: { color: "#fff" },

  // Inputs
  inputWrapper: { marginBottom: 16 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  inputActive: { borderColor: "#1e40af", backgroundColor: "#fff" },
  input: { flex: 1, color: "#0f172a", fontSize: 14, fontWeight: '500' },
  
  errorText: { color: "#ef4444", fontSize: 12, textAlign: 'center', fontWeight: '600', marginBottom: 15 },
  
  // Button
  button: { borderRadius: 20, overflow: "hidden", marginTop: 10, marginBottom: 20 },
  btnInner: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  btnArrow: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },

  footer: { flexDirection: "row", justifyContent: "center" },
  footerText: { color: "#64748B", fontSize: 13 },
  link: { color: "#1e40af", fontSize: 13, fontWeight: "800" },
});