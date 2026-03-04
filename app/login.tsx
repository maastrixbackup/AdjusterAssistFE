import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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

const LoginScreen: React.FC = () => {
  const { isHydrated, isAuthenticated, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const logoImg = require("../assets/images/AdjusterAssist1.png");
  const abstractImg = require("../assets/images/abstract1.png");

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isHydrated]);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      setErrorMessage(message);
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Login with your email and password.
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Email Address"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
            {errorMessage ? (
              <Text style={styles.error}>{errorMessage}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
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
                  <Text style={styles.buttonText}>Log In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/forgot-password")}>
              <Text style={styles.forgot}>Forgot password?</Text>
            </TouchableOpacity>

            <Text style={styles.signup}>
              Don{"'"}t have an account?{" "}
              <Text style={styles.signupLink}>Sign Up</Text>
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
  );
};

export default LoginScreen;

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
  appName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: fontMedium,
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

  forgot: {
    textAlign: "center",
    color: "#0B5ED7",
    marginTop: 16,
    fontSize: 14,
    fontFamily: fontMedium,
  },

  signup: {
    textAlign: "center",
    marginTop: 20,
    color: "#6B7280",
    fontSize: 14,
    fontFamily: fontRegular,
  },

  signupLink: {
    color: "#0B5ED7",
    fontWeight: "600",
    fontFamily: fontMedium,
  },
  error: {
    marginTop: 8,
    color: "#B42318",
    textAlign: "center",
    fontFamily: fontMedium,
  },
});
