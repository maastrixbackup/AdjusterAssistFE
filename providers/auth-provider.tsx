import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { loginWithEmail, requestPasswordReset } from '@/lib/api';

type AuthContextValue = {
  isHydrated: boolean;
  isAuthenticated: boolean;
  token: string | null;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
};

const SESSION_KEY = 'adjusterassist_session_v1';

const AuthContext = createContext<AuthContextValue | null>(null);

type SessionData = {
  token: string;
  email: string;
};

function saveSession(session: SessionData | null) {
  if (Platform.OS !== 'web') {
    return;
  }

  if (!session) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): SessionData | null {
  if (Platform.OS !== 'web') {
    return null;
  }

  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

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
    const session = loadSession();
    if (session) {
      setToken(session.token);
      setEmail(session.email);
    }
    setIsHydrated(true);
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
        saveSession(session);
      },
      logout() {
        setToken(null);
        setEmail(null);
        saveSession(null);
      },
      async sendPasswordReset(inputEmail: string) {
        await requestPasswordReset(inputEmail);
      },
    }),
    [email, isHydrated, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
