import { BASE_URL } from "@/lib/config/apiConfig";

export type OutputType = "email" | "file" | "escalation";

export type AuthSession = {
  token: string;
  email: string;
};

type AuthApiResponse = {
  success: boolean;
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  token: string;
};

export type GenerateResponseRequest = {
  type: OutputType;
};

export type GenerateResponseResult = {
  responseType: OutputType;
  responseTypeLabel: string;
  responseText: string;
};

export type SubscriptionStatus = {
  plan: "free" | "paid";
  monthlyLimit: number;
  usedThisMonth: number;
  remainingThisMonth: number;
  canGenerate: boolean;
  priceLabel: string;
};

const API_BASE_URL = BASE_URL;
// const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const responseTypeLabels: Record<OutputType, string> = {
  email: "Email Response",
  file: "File Note",
  escalation: "Escalation Response",
};

async function apiRequest<T>(
  path: string,
  init: RequestInit,
  token?: string,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  const url = `${API_BASE_URL}${path}`;
  const method = init.method ?? "GET";
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers ?? {}),
  };

  console.log("[API REQUEST]", {
    url,
    method,
    body: init.body ?? null,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
    });
  } catch (error) {
    console.log("[API NETWORK ERROR]", {
      url,
      method,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const json = await response.json().catch(() => ({}));
  console.log("[API RESPONSE]", {
    url,
    method,
    status: response.status,
    ok: response.ok,
    data: json,
  });

  if (!response.ok) {
    throw new Error(json?.message ?? "Request failed");
  }

  return json as T;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  const data = await apiRequest<AuthApiResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return {
    token: data.token,
    email: data.user.email,
  };
}

export async function signupWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const data = await apiRequest<AuthApiResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

  return {
    token: data.token,
    email: data.user.email,
  };
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!API_BASE_URL) {
    return;
  }

  await apiRequest<{ ok: true }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  if (!API_BASE_URL) {
    return;
  }

  await apiRequest<{ ok: true }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function generateResponse(
  token: string,
  payload: GenerateResponseRequest,
): Promise<GenerateResponseResult> {
  const res = await apiRequest<{ success?: boolean; data?: string; message?: string }>(
    "/drafts/generate",
    {
      method: "POST",
      body: JSON.stringify({
        type: payload.type,
      }),
    },
    token,
  );

  return {
    responseType: payload.type,
    responseTypeLabel: responseTypeLabels[payload.type],
    responseText: res.data ?? res.message ?? "",
  };
}

export async function getSubscriptionStatus(
  token: string,
): Promise<SubscriptionStatus> {
  if (!API_BASE_URL) {
    return {
      plan: "free",
      monthlyLimit: 10,
      usedThisMonth: 0,
      remainingThisMonth: 10,
      canGenerate: true,
      priceLabel: "$49/month",
    };
  }

  return apiRequest<SubscriptionStatus>(
    "/v1/subscription/status",
    { method: "GET" },
    token,
  );
}

export async function createCheckoutSession(
  token: string,
): Promise<{ checkoutUrl: string }> {
  if (!API_BASE_URL) {
    return { checkoutUrl: "https://stripe.com" };
  }

  return apiRequest<{ checkoutUrl: string }>(
    "/v1/subscription/checkout",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    token,
  );
}
