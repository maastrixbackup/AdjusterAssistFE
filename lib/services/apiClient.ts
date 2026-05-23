import { BASE_URL } from "@/lib/config/apiConfig";
import { logoutUser, refreshSessionApi } from "@/lib/services/authService";
import {
  clearSessionTokens,
  getRefreshToken,
  getToken,
  saveSessionTokens,
} from "@/lib/utils/storage";
import { router } from "expo-router";

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let isLoggingOut = false;

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
    router.replace("/login");
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

    const response = await refreshSessionApi(refreshToken);

    await saveSessionTokens({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
    });

    return response.access_token;
  } catch (error) {
    console.log("[TOKEN REFRESH FAILED]", error);
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

  console.log("[API REQUEST]", {
    url,
    method,
    body,
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

  console.log("[API RESPONSE]", {
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

      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const newAccessToken = await refreshPromise;

    if (!newAccessToken) {
      await performLogout();
      throw new Error("Session expired. Please login again.");
    }

    return apiRequest<T>(endpoint, method, body, false);
  }

  if (response.status === 401 && isRefreshEndpoint) {
    await performLogout();
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    throw new Error(data?.message ?? "Request failed");
  }

  return data as T;
}
