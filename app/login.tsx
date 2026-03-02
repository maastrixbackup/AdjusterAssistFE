import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";


const LoginScreen: React.FC = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const logoImg = require("../assets/images/AdjusterAssist1.png");
  return (
    <SafeAreaProvider>
      <LinearGradient
        colors={["#1E63B6", "#0B3C7A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView edges={["top"]} style={styles.safe}>

          <LinearGradient
            colors={["#1E63B6", "#0B3C7A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View>
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
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Password"
                secureTextEntry={!showPassword}
                style={styles.input}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace("/(tabs)")}
            >
              <LinearGradient
                colors={["#0549a1","#1E63B6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Log In</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity>
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
    height: 120,
    justifyContent: "center",
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: Platform.select({
      ios: "AvenirNext-DemiBold",
      android: "sans-serif-medium",
      default: "System",
    }),
  },

  logo: {
    width: 240,
    resizeMode: "contain",
    top: 0,
    left: 24
  },

  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginTop: -8,

    padding: 24,
    paddingTop: 28,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
    fontFamily: Platform.select({
      ios: "AvenirNext-Bold",
      android: "sans-serif-medium",
      default: "System",
    }),
  },

  subtitle: {
    textAlign: "center",
    color: "#6B7280",
    marginVertical: 10,
    fontSize: 14,
    fontFamily: Platform.select({
      ios: "AvenirNext-Regular",
      android: "sans-serif",
      default: "System",
    }),
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
    fontFamily: Platform.select({
      ios: "AvenirNext-Regular",
      android: "sans-serif",
      default: "System",
    }),
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
    fontFamily: Platform.select({
      ios: "AvenirNext-DemiBold",
      android: "sans-serif-medium",
      default: "System",
    }),
  },

  forgot: {
    textAlign: "center",
    color: "#0B5ED7",
    marginTop: 16,
    fontSize: 14,
    fontFamily: Platform.select({
      ios: "AvenirNext-Medium",
      android: "sans-serif-medium",
      default: "System",
    }),
  },

  signup: {
    textAlign: "center",
    marginTop: 20,
    color: "#6B7280",
    fontSize: 14,
    fontFamily: Platform.select({
      ios: "AvenirNext-Regular",
      android: "sans-serif",
      default: "System",
    }),
  },

  signupLink: {
    color: "#0B5ED7",
    fontWeight: "600",
    fontFamily: Platform.select({
      ios: "AvenirNext-DemiBold",
      android: "sans-serif-medium",
      default: "System",
    }),
  },
});
