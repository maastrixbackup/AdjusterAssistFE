import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { setUnauthorizedHandler } from "@/lib/services/authEvents";
import {
  AuthSession,
  LoginResult,
  loginWithEmail,
  logoutUser,
  MfaTempSession,
  refreshSessionApi,
  requestPasswordReset,
  signupWithEmail,
} from "@/lib/services/authService";
import { clearSessionTokens, saveSessionTokens } from "@/lib/utils/storage";
import { router } from "expo-router";

type AalLevel = "aal1" | "aal2";

type AuthContextValue = {
  isHydrated: boolean;
  isAuthenticated: boolean;
  needsMfaSetup: boolean;

  token: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  email: string | null;
  aal: AalLevel | null;
  mfaTempSession: MfaTempSession | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeMfaLogin: (session: AuthSession) => Promise<void>;
  refreshAuthSession: () => Promise<string | null>;
  updateMfaTempSession: (session: MfaTempSession) => void;
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
};

const SESSION_KEY = "adjusterassist_session_v1";
const AuthContext = createContext<AuthContextValue | null>(null);

type SessionData = {
  token: string;
  access_token: string;
  refresh_token: string;
  email: string;
  expires_at?: number;
  aal?: AalLevel;
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [aal, setAal] = useState<AalLevel | null>(null);

  const [mfaTempSession, setMfaTempSession] = useState<MfaTempSession | null>(
    null,
  );

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
        setAccessToken(session.access_token);
        setRefreshToken(session.refresh_token);
        setEmail(session.email);
        setAal(session.aal || "aal1");
      }

      setHasSeenOnboarding(onboarded === "true");
      setIsHydrated(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function persistAuthenticatedSession(session: AuthSession) {
    const finalAal = session.aal || "aal1";

    setToken(session.access_token);
    setAccessToken(session.access_token);
    setRefreshToken(session.refresh_token);
    setEmail(session.email);
    setAal(finalAal);
    setMfaTempSession(null);

    await saveSessionTokens({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    await saveSession({
      token: session.access_token,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      email: session.email,
      aal: finalAal,
    });
  }
  async function clearAuthState() {
    setToken(null);
    setAccessToken(null);
    setRefreshToken(null);
    setEmail(null);
    setAal(null);
    setMfaTempSession(null);

    await saveSession(null);
    await clearSessionTokens();
  }

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearAuthState();

      await AsyncStorage.removeItem("@session_saved_drafts_data");
      await AsyncStorage.removeItem("@session_saved_drafts");

      router.replace("/login");
    });
  }, []);

  const isFullyAuthenticated = Boolean(accessToken && aal === "aal2");
  const needsMfaSetup = Boolean(mfaTempSession && !mfaTempSession.factor_id);
  async function refreshAuthSessionInternal() {
    if (!refreshToken) {
      await clearAuthState();
      await logoutUser();
      return null;
    }

    try {
      const response = await refreshSessionApi(refreshToken);

      const newSession: AuthSession = {
        token: response.access_token,
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        expires_at: response.expires_at,
        email: response.user.email,
        aal: response.aal || "aal1",
      };

      await persistAuthenticatedSession(newSession);

      return response.access_token;
    } catch {
      await clearAuthState();
      await logoutUser();
      return null;
    }
  }
  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrated,
      isAuthenticated: isFullyAuthenticated,
      needsMfaSetup,
      token,
      accessToken,
      refreshToken,
      email,
      aal,

      mfaTempSession,

      async login(inputEmail: string, password: string) {
        const result = await loginWithEmail(inputEmail, password);

        if (
          result.type === "MFA_REQUIRED" ||
          result.type === "MFA_SETUP_REQUIRED"
        ) {
          setMfaTempSession(result.mfa);

          setToken(null);
          setAccessToken(null);
          setRefreshToken(null);
          setEmail(result.mfa.email);
          setAal("aal1");

          await saveSession(null);

          return result;
        }

        await persistAuthenticatedSession(result.session);
        return result;
      },

      async completeMfaLogin(session: AuthSession) {
        await persistAuthenticatedSession({
          ...session,
          aal: "aal2",
        });
      },

      async refreshAuthSession() {
        return refreshAuthSessionInternal();
      },

      updateMfaTempSession(session: MfaTempSession) {
        setMfaTempSession(session);
        setEmail(session.email);
        setAal("aal1");

        setToken(null);
        setAccessToken(null);
        setRefreshToken(null);
      },
      async signup(
        name: string,
        inputEmail: string,
        role: string,
        password: string,
        acceptedPolicy: boolean,
      ) {
        await signupWithEmail(name, inputEmail, role, password, acceptedPolicy);

        await clearAuthState();
        await logoutUser();
      },

      async completeOnboarding() {
        await AsyncStorage.setItem("@has_seen_onboarding", "true");
        setHasSeenOnboarding(true);
      },

      logout() {
        void clearAuthState();
        void AsyncStorage.removeItem("@session_saved_drafts_data");
        void AsyncStorage.removeItem("@session_saved_drafts");
        void logoutUser();
      },

      async sendPasswordReset(inputEmail: string) {
        await requestPasswordReset(inputEmail);
      },

      hasSeenOnboarding,
    }),
    [
      isHydrated,
      isFullyAuthenticated,
      needsMfaSetup,
      token,
      accessToken,
      refreshToken,
      email,
      aal,
      mfaTempSession,
      hasSeenOnboarding,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
