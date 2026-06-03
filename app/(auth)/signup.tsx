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
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);

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
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error("Required Fields", { description: "Please fill in all details." });
      return;
    }

    if (!acceptedPolicy) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error("Privacy Policy", { description: "You must accept the privacy policy to continue." });
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

    try {
      await toast.promise(
        signup(name, email, role, password, acceptedPolicy),
        {
          loading: "Creating account...",
          success: () => {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
            setVerificationEmailSent(true);
            return "Verification email sent. Please check your inbox.";
          },
          error: (err: any) => {
            return (
              err?.message ||
              "An error occurred during signup."
            );
          },
        }
      );
    } finally {
      setLoading(false);
    }
  }

  const logoStyle = {
    height: 50,
    width: isTablet ? 240 : width * 0.5,
    resizeMode: "contain" as const,
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* FIX 1: Explicitly using 'padding' behavior with an offset to keep rendering clean */}
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "ios" ? 100 : 60 }]}
          // FIX 2: Removed automaticallyAdjustKeyboardInsets to stop layout calculation fighting
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false} // FIX 3: Disables overscroll micro-stuttering during keyboard layout changes
        >
          {/* ══ ARC HEADER ══════════════════════════════════════════ */}
          <View
            style={[
              styles.arcHeader,
              { height: Math.max(180, height * 0.25) }
            ]}
          >
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
          <View style={[styles.body, { marginTop: -20 }]}>
            <View style={[styles.card, isTablet && { maxWidth: 500, alignSelf: 'center' }]}>

              {!verificationEmailSent ? (
                <>
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
                        <Text style={[
                          styles.roleText,
                          role === item.id && styles.roleTextActive,
                          { fontSize: width < 380 ? 10 : 12 }
                        ]}>
                          {item.label}
                        </Text>
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

                  {/* PRIVACY POLICY CHECKBOX */}
                  <View style={styles.privacyWrapper}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setAcceptedPolicy(!acceptedPolicy);
                      }}
                      style={[styles.checkbox, acceptedPolicy && styles.checkboxChecked]}
                    >
                      {acceptedPolicy && <Feather name="check" size={12} color="#fff" />}
                    </Pressable>

                    <View style={styles.privacyTextContainer}>
                      <Text style={styles.footerText}>I agree to the </Text>
                      <Pressable onPress={() => router.push("/privacy")}>
                        <Text style={styles.link}>Privacy Policy</Text>
                      </Pressable>
                    </View>
                  </View>

                  {error && <Text style={styles.errorText}>{error}</Text>}

                  {/* SUBMIT BUTTON */}
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
                </>
              ) : (
                /* ══ EMAIL VERIFICATION SUCCESS STATE ═══════════════════════ */
                <View style={[styles.verifyBox, { borderWidth: 0, backgroundColor: 'transparent', padding: 0 }]}>
                  <View style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8
                  }}>
                    <Feather name="mail" size={28} color="#1e40af" />
                  </View>

                  <Text style={[styles.verifyTitle, { fontSize: 20 }]}>
                    Verify Your Email
                  </Text>

                  <Text style={[styles.verifyText, { fontSize: 14, color: '#64748B', marginTop: 10 }]}>
                    We sent a verification link to{"\n"}
                    <Text style={{ fontWeight: "700", color: '#1E293B' }}>{email}</Text>
                  </Text>

                  <Text style={[styles.verifyText, { fontSize: 13, color: '#94A3B8', marginTop: 8 }]}>
                    Please check your inbox and confirm your email to activate your account.
                  </Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.button,
                      { width: '100%', marginTop: 28, marginBottom: 0 },
                      pressed && { transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={() => router.replace("/login")}
                  >
                    <LinearGradient colors={["#1e40af", "#1e3a8a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnInner}>
                      <Text style={styles.btnText}>Go to Sign In</Text>
                      <View style={styles.btnArrow}><Feather name="arrow-right" size={16} color="#1e40af" /></View>
                    </LinearGradient>
                  </Pressable>
                </View>
              )}

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scroll: { flexGrow: 1, backgroundColor: "#F8FAFC" },
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

  body: { flex: 1, paddingHorizontal: 20, paddingBottom: 40, marginTop: -30, },
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
  roleActive: { backgroundColor: "#2d4cb1", borderColor: "#1e40af" },
  roleTextActive: { color: "#fff" },

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

  button: { borderRadius: 20, overflow: "hidden", marginTop: 10, marginBottom: 20 },
  btnInner: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  btnArrow: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },

  footer: { flexDirection: "row", justifyContent: "center" },
  footerText: { color: "#64748B", fontSize: 13 },
  link: { color: "#1e40af", fontSize: 13, fontWeight: "800" },
  arcHeader: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
    justifyContent: 'center',
    minHeight: 180,
  },

  privacyWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  privacyTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },

  roleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    width: '100%'
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  roleText: {
    fontWeight: "600",
    color: "#64748B"
  },
  verifyBox: {
    marginTop: 10,
    marginBottom: 20,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  verifyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#1E3A8A",
  },

  verifyText: {
    marginTop: 6,
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },

  verifyLoginButton: {
    marginTop: 16,
    backgroundColor: "#1E40AF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },

  verifyLoginText: {
    color: "#fff",
    fontWeight: "700",
  },
});