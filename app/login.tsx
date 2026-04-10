import { useAuth } from "@/providers/auth-provider";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
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

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const { isHydrated, isAuthenticated, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const logoImg = require("../assets/images/AdjusterAssist1.png");

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardOpen(true);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardOpen(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // const logoImg = require("../assets/images/AdjusterAssist1.png");

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isHydrated]);

  if (!isHydrated || isAuthenticated) {
    return (
      <View style={[{ justifyContent: "center", alignItems: "center" }]}>
        <LinearGradient
          colors={["#276bbd", "#0B3C7A"]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  async function handleLogin() {
    // 1. Instant Validation
    if (!email.trim() || !password.trim()) {
      toast.error("Missing Credentials", {
        description: "Please enter both email and password.",
        style: { borderRadius: 8, backgroundColor: "#1411be" },
      });
      return;
    }

    toast.promise(login(email.trim(), password), {
      loading: "Verifying your credentials...",
      success: () => {
        return "Welcome back!";
      },
      error: (err) => {
        return err instanceof Error ? err.message : "Invalid email or password";
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
          ref={scrollRef}
          contentContainerStyle={[
            styles.scroll,
            // keyboardOpen && { paddingBottom: 200 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <SafeAreaView style={styles.safe}>
            <View style={styles.contentWrapper}>
              {/* HEADER */}
              <View style={styles.header}>
                <Image
                  source={logoImg}
                  style={[styles.logo, { width: isTablet ? 240 : width * 0.5 }]}
                />
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Secure Login</Text>
              </View>

              {/* CARD */}
              <View style={styles.center}>
                <View style={[styles.card, isTablet && { padding: 32 }]}>
                  {/* EMAIL */}
                  <View
                    style={[
                      styles.inputBox,
                      focused === "email" && styles.active,
                    ]}
                  >
                    <Feather name="mail" size={18} color="#94A3B8" />
                    <TextInput
                      placeholder="Email"
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                    />
                  </View>

                  {/* PASSWORD */}
                  <View
                    style={[
                      styles.inputBox,
                      focused === "pass" && styles.active,
                    ]}
                  >
                    <Feather name="lock" size={18} color="#94A3B8" />
                    <TextInput
                      placeholder="Password"
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocused("pass")}
                      onBlur={() => setFocused(null)}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={18}
                      />
                    </Pressable>
                  </View>

                  <Pressable onPress={() => router.push("/forgot-password")}>
                    <Text style={styles.forgot}>Forgot Password?</Text>
                  </Pressable>

                  {/* BUTTON */}
                  <Pressable style={styles.button} onPress={handleLogin}>
                    <LinearGradient
                      colors={["#276bbd", "#1E63B6"]}
                      style={styles.btnInner}
                    >
                      <Text style={styles.btnText}>Continue</Text>
                    </LinearGradient>
                  </Pressable>

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>New here?</Text>
                    <Pressable onPress={() => router.push("/signup")}>
                      <Text style={styles.link}>Create Account</Text>
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
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  safe: { flex: 1 },

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
    maxWidth: 420, // 🔥 KEY for responsiveness
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

  forgot: {
    textAlign: "right",
    marginBottom: 16,
    color: "#64748B",
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
