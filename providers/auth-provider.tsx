import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  loginWithEmail,
  logoutUser,
  requestPasswordReset,
  resetPassword as resetUserPassword,
  signupWithEmail,
  verifyPasswordResetOtp as verifyOtpForPasswordReset,
} from "@/lib/services/authService";
import { supabase } from "@/lib/supabase";
import * as Linking from "expo-linking";
import { router } from "expo-router";

type AuthContextValue = {
  isHydrated: boolean;
  isAuthenticated: boolean;
  token: string | null;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  hasSeenOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  signup: (
    name: string,
    email: string,
    role: string,
    password: string,
    acceptedPolicy: boolean,
  ) => Promise<void>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
  verifyPasswordResetOtp: (email: string, otp: string) => Promise<void>;
  resetPassword: (
    email: string,
    otp: string,
    newPassword: string,
  ) => Promise<void>;
};

const SESSION_KEY = "adjusterassist_session_v1";
const AuthContext = createContext<AuthContextValue | null>(null);

type SessionData = {
  token: string;
  email: string;
};

async function saveSession(session: SessionData | null) {
  if (!session) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function loadSession(): Promise<SessionData | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [session, onboarded] = await Promise.all([
        loadSession(),
        AsyncStorage.getItem("@has_seen_onboarding"),
      ]);
      if (!mounted) return;
      if (session) {
        setToken(session.token);
        setEmail(session.email);
      }
      setHasSeenOnboarding(onboarded === "true");
      setIsHydrated(true);
    })();
    return () => { mounted = false; };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrated,
      isAuthenticated: Boolean(token),
      token,
      email,
      hasSeenOnboarding,
      async login(inputEmail: string, password: string) {
        const session = await loginWithEmail(inputEmail, password);
        setToken(session.token);
        setEmail(session.email);
        await saveSession(session);
      },
      async signup(
        name: string,
        inputEmail: string,
        role: string,
        password: string,
        acceptedPolicy: boolean,
      ) {
        await signupWithEmail(name, inputEmail, role, password, acceptedPolicy);
        setToken(null);
        setEmail(null);
        await saveSession(null);
        await logoutUser();
      },
      async completeOnboarding() {
        await AsyncStorage.setItem("@has_seen_onboarding", "true");
        setHasSeenOnboarding(true); // ✅ instant state update, no re-read needed
      },
      logout() {
        setToken(null);
        setEmail(null);

        // 1. Clear the Auth Session (Token/Email)
        void saveSession(null);

        void AsyncStorage.removeItem("@session_saved_drafts_data");
        void AsyncStorage.removeItem("@session_saved_drafts");

        // void AsyncStorage.removeItem("@has_seen_onboarding");

        // 3. Call the API logout if necessary
        void logoutUser();
      },
      async sendPasswordReset(inputEmail: string) {
        await requestPasswordReset(inputEmail);
      },
      async verifyPasswordResetOtp(inputEmail: string, otp: string) {
        await verifyOtpForPasswordReset(inputEmail, otp);
      },
      async resetPassword(inputEmail: string, otp: string, newPassword: string) {
        await resetUserPassword(inputEmail, otp, newPassword);
      },
    }),
    [email, isHydrated, token, hasSeenOnboarding],
  );
  useEffect(() => {
    // Handle app opened from email link
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      const parsed = Linking.parse(url);

      // Supabase sends tokens in hash fragment
      const hash = url.split("#")[1];

      if (!hash) return;

      const params = new URLSearchParams(hash);

      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const type = params.get("type");

      // PASSWORD RECOVERY FLOW
      if (
        type === "recovery" &&
        access_token &&
        refresh_token
      ) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (!error) {
          router.replace("/reset-password");
        }
      }
    };

    // App already opened from link
    Linking.getInitialURL().then(handleDeepLink);

    // App opened while running
    const subscription = Linking.addEventListener(
      "url",
      ({ url }) => {
        handleDeepLink(url);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
