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
} from "@/lib/services/authService";

type AuthContextValue = {
  isHydrated: boolean;
  isAuthenticated: boolean;
  token: string | null;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  // ✅ UPDATED: Added role to the type definition
  signup: (
    name: string,
    email: string,
    role: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      const session = await loadSession();
      if (!mounted) return;
      if (session) {
        setToken(session.token);
        setEmail(session.email);
      }
      setIsHydrated(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrated,
      isAuthenticated: Boolean(token),
      token,
      email,
      async login(inputEmail: string, password: string) {
        const session = await loginWithEmail(inputEmail, password);
        setToken(session.token);
        setEmail(session.email);
        await saveSession(session);
      },
      // ✅ FIXED: Matches the 4 arguments required for role-based signup
      async signup(
        name: string,
        inputEmail: string,
        role: string,
        password: string,
      ) {
        await signupWithEmail(name, inputEmail, role, password);
        // Usually, after signup, we keep them logged out until they verify or login manually
        setToken(null);
        setEmail(null);
        await saveSession(null);
        await logoutUser();
      },
      logout() {
        setToken(null);
        setEmail(null);
        void logoutUser();
        void saveSession(null);
      },
      async sendPasswordReset(inputEmail: string) {
        await requestPasswordReset(inputEmail);
      },
      async resetPassword(inputToken: string, newPassword: string) {
        await resetUserPassword(inputToken, newPassword);
      },
    }),
    [email, isHydrated, token],
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
