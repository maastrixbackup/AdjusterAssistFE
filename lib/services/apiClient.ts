import { BASE_URL } from "@/lib/config/apiConfig";
import { logoutUser, refreshSessionApi } from "@/lib/services/authService";
import * as Sentry from "@sentry/react-native";
import {
  clearSessionTokens,
  getRefreshToken,
  getToken,
  saveSessionTokens,
} from "@/lib/utils/storage";
import { triggerUnauthorizedLogout } from "./authEvents";

/* --- Global Concurrency State Control Variables --- */
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let isLoggingOut = false;

const DEBUG_MODE = true;
const colors = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function debugLog(
  color: keyof typeof colors,
  label: string,
  payload?: unknown,
) {
  if (!DEBUG_MODE) return;
  console.log(
    `${colors[color]}${colors.bold}[${label}]${colors.reset}`,
    payload ?? "",
  );
}

const PUBLIC_AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/resend-verification",
  "/auth/refresh",
];

function isPublicAuthEndpoint(endpoint: string) {
  return PUBLIC_AUTH_ENDPOINTS.some((item) => endpoint.startsWith(item));
}

async function performLogout() {
  if (isLoggingOut) return;
  isLoggingOut = true;
  try {
    await clearSessionTokens();
    await logoutUser();
    await triggerUnauthorizedLogout();
  } finally {
    setTimeout(() => {
      isLoggingOut = false;
    }, 500);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    debugLog("yellow", "TOKEN REFRESH STARTED VIA CONFIG INTERCEPTOR");
    const response = await refreshSessionApi(refreshToken);
    await saveSessionTokens({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
    });

    debugLog("green", "TOKEN REFRESH SUCCESS VIA CONFIG INTERCEPTOR");
    return response.access_token;
  } catch (error) {
    console.log(
      `${colors.red}${colors.bold}[TOKEN REFRESH FAILED]${colors.reset}`,
      error,
    );
    Sentry.captureException(error, {
      tags: {
        area: "auth",
        action: "refresh_access_token",
      },
    });
    return null;
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  method = "GET",
  body: unknown = null,
  retry = true,
): Promise<T> {
  const token = await getToken();
  const refreshToken = await getRefreshToken();

  const url = `${BASE_URL}${endpoint}`;
  const isRefreshEndpoint = endpoint === "/auth/refresh";
  const isPublicEndpoint = isPublicAuthEndpoint(endpoint);

  debugLog("blue", "API REQUEST CONFIG STARTED", {
    url,
    method,
    hasToken: Boolean(token),
    retry,
  });

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && !isPublicEndpoint
        ? { Authorization: `Bearer ${token}` }
        : {}),
    },
    body: body ? JSON.stringify(body) : null,
  });

  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };

  debugLog(response.ok ? "green" : "red", "API RESPONSE CONFIG RECEIVED", {
    url,
    method,
    status: response.status,
    ok: response.ok,
    data,
  });

  const shouldTryRefresh =
    response.status === 401 &&
    retry &&
    !isRefreshEndpoint &&
    !isPublicEndpoint &&
    Boolean(token) &&
    Boolean(refreshToken);

  if (shouldTryRefresh) {
    if (!isRefreshing) {
      isRefreshing = true;
      debugLog("magenta", "401 RETRY QUEUED IN CONFIG", { endpoint });

      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const newAccessToken = await refreshPromise;

    if (!newAccessToken) {
      debugLog("red", "REFRESH RETURNED NULL - FORCING OUT VIA CONFIG");
      Sentry.captureMessage("Refresh token failed. Forced logout triggered.", {
        level: "warning",
        tags: {
          area: "auth",
          action: "forced_logout_after_refresh_failure",
          endpoint,
        },
      });
      await performLogout();
      throw new Error("Session expired. Please login again.");
    }

    return apiRequest<T>(endpoint, method, body, false);
  }

  if (response.status === 401 && isRefreshEndpoint) {
    debugLog("red", "REFRESH ENDPOINT RETURNED 401 - TERMINATING SESSION");
    Sentry.captureMessage("Refresh endpoint returned 401.", {
      level: "warning",
      tags: {
        area: "auth",
        action: "refresh_endpoint_401",
      },
    });
    await performLogout();
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    const message = data?.message ?? "Request failed";
    const shouldReportToSentry =
      response.status >= 500 || response.status === 0;
    if (shouldReportToSentry) {
      Sentry.captureMessage(message, {
        level: "error",
        tags: {
          area: "api",
          endpoint,
          method,
          status: String(response.status),
        },
      });
    }

    throw new Error(message);
  }

  return data as T;
}
