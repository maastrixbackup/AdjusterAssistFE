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
    role: string;
  };
  token: string;
};

/**
 * UPDATED: Matches your required JSON payload exactly
 */
export type GenerateResponseRequest = {
  fileId: number;
  type: OutputType;
  userInput: string;
  shouldSave: boolean;
};

export type GenerateResponseResult = {
  responseType: OutputType;
  responseTypeLabel: string;
  responseText: string;
};

export type SubscriptionStatus = {
  success: boolean;
  subscription: {
    plan_type: string;
    usage_limit: number;
    current_usage: number;
    remaining: number;
    expires_at: string;
  };
};

const API_BASE_URL = BASE_URL;
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
    throw new Error("Missing API_BASE_URL");
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
  role: string,
  password: string,
): Promise<AuthSession> {
  const data = await apiRequest<AuthApiResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, role, password }),
  });

  return {
    token: data.token,
    email: data.user.email,
  };
}

/**
 * UPDATED: Uses the explicit payload structure and handles credit-based failures
 */
export async function generateResponse(
  token: string,
  payload: GenerateResponseRequest,
): Promise<GenerateResponseResult> {
  // Update the type definition here to match your real API response
  const res = await apiRequest<{
    success: boolean;
    message: string;
    data: {
      draftId: number;
      claim_number: string;
      client_name: string;
      content: string; // This is what we need!
    };
  }>(
    "/drafts/generate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );

  if (res.success === false) {
    throw new Error(res.message || "Insufficient credits.");
  }

  return {
    responseType: payload.type,
    responseTypeLabel: responseTypeLabels[payload.type] || "Response",
    // FIX: Access res.data.content instead of just res.data
    responseText: res.data?.content ?? res.message ?? "No content generated",
  };
}

export async function getSubscriptionStatus(
  token: string,
): Promise<SubscriptionStatus> {
  if (!API_BASE_URL) {
    return {
      success: true,
      subscription: {
        plan_type: "free",
        usage_limit: 5,
        current_usage: 0,
        remaining: 5,
        expires_at: new Date().toISOString(),
      },
    };
  }

  return apiRequest<SubscriptionStatus>(
    "/subscriptions/my-plan",
    { method: "GET" },
    token,
  );
}

export async function upgradeSubscription(
  token: string,
  planType: "pro" | "enterprise",
): Promise<{ checkoutUrl: string }> {
  return apiRequest<{ checkoutUrl: string }>(
    "/subscriptions/upgrade",
    {
      method: "POST",
      body: JSON.stringify({ planType }),
    },
    token,
  );
}
