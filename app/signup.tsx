import { useAuth } from "@/providers/auth-provider";
import { Feather, Ionicons } from "@expo/vector-icons";
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
  const { width } = useWindowDimensions();
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

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  // --- PASSWORD VALIDATION LOGIC ---
  const validatePassword = (pass: string) => {
    const hasNumber = /\d/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const hasMinLength = pass.length >= 8;

    if (!hasMinLength) return "Password must be at least 8 characters long.";
    if (!hasNumber) return "Password must contain at least one number.";
    if (!hasSpecial) return "Password must contain at least one special character.";
    
    return null;
  };

  async function handleSignup() {
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Fill all fields");
      return;
    }

    // Check Password Strength
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

    toast.promise(signup(name, email, role, password), {
      loading: "Creating your account...",
      success: (data) => {
        // Redirect to login after successful creation
        setTimeout(() => router.push("/login"), 1500);
        return "Welcome! Account created successfully.";
      },
      error: (err) => {
        setLoading(false);
        return "Signup failed. Please try again.";
      },
    });
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
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Get Started Securely</Text>
              </View>

              <View style={styles.center}>
                <View style={[styles.card, isTablet && { padding: 32 }]}>

                  {/* NAME */}
                  <View style={[styles.inputBox, focused === "name" && styles.active]}>
                    <Feather name="user" size={18} color="#94A3B8" />
                    <TextInput
                      placeholder="Full Name"
                      placeholderTextColor="#CBD5E1"
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      onFocus={() => setFocused("name")}
                      onBlur={() => setFocused(null)}
                    />
                  </View>

                  {/* EMAIL */}
                  <View style={[styles.inputBox, focused === "email" && styles.active]}>
                    <Feather name="mail" size={18} color="#94A3B8" />
                    <TextInput
                      placeholder="Email"
                      placeholderTextColor="#CBD5E1"
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                    />
                  </View>

                  {/* ROLE */}
                  <View style={styles.roleRow}>
                    {["ca", "pa"].map((r) => (
                      <Pressable
                        key={r}
                        style={[
                          styles.roleButton,
                          role === r && styles.roleActive,
                        ]}
                        onPress={() => setRole(r as RoleType)}
                      >
                        <Text style={[
                          styles.roleText,
                          role === r && styles.roleTextActive,
                        ]}>
                          {r === "ca" ? "Licensed Adjuster" : "Public Adjuster"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* PASSWORD */}
                  <View style={[styles.inputBox, focused === "pass" && styles.active]}>
                    <Feather name="lock" size={18} color="#94A3B8" />
                    <TextInput
                      placeholder="Password"
                      placeholderTextColor="#CBD5E1"
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocused("pass")}
                      onBlur={() => setFocused(null)}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} />
                    </Pressable>
                  </View>

                  {/* CONFIRM */}
                  <View style={[styles.inputBox, focused === "confirm" && styles.active]}>
                    <Feather name="shield" size={18} color="#94A3B8" />
                    <TextInput
                      placeholder="Confirm Password"
                      placeholderTextColor="#CBD5E1"
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setFocused("confirm")}
                      onBlur={() => setFocused(null)}
                    />
                  </View>

                  {error && <Text style={styles.error}>{error}</Text>}

                  <Pressable style={styles.button} onPress={handleSignup} disabled={loading}>
                    <LinearGradient
                      colors={["#276bbd", "#1E63B6"]}
                      style={styles.btnInner}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnText}>Create Account</Text>
                      )}
                    </LinearGradient>
                  </Pressable>

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have account?</Text>
                    <Pressable onPress={() => router.push("/login")}>
                      <Text style={styles.link}>Login</Text>
                    </Pressable>
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
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    color: "#FFF",
    fontWeight: "700",
  },
  subtitle: {
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
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 12,
  },
  active: {
    borderWidth: 1,
    borderColor: "#276bbd",
    backgroundColor: "#FFF",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: "#000000",
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  roleButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
  },
  roleActive: {
    backgroundColor: "#276bbd",
  },
  roleText: {
    fontSize: 12,
  },
  roleTextActive: {
    color: "#fff",
  },
  error: {
    color: "red",
    marginBottom: 10,
    fontSize: 12,
    textAlign: 'center'
  },
  button: {
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
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  footerText: {
    color: "#64748B",
  },
  link: {
    color: "#276bbd",
    marginLeft: 5,
    fontWeight: "700",
  },
});