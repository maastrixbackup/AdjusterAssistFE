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

export interface ClaimFile {
  id: number;
  user_id: number;
  claim_number: string;
  policy_number: string | null;
  client_name: string;
  status: string;
  created_at: string;
  updated_at?: string;
  draft_count?: number;
}

// Data structure for creating a new file from the frontend
export interface CreateFileRequest {
  client_name: string;
  policy_number: string | null;
  claim_number: string;
  status: string;
}

export interface RecentDraft {
  id: number;
  file_id: number;
  user_id: number;
  draft_type: OutputType;
  content: string;
  created_at: string;
  claim_number: string;
  client_name: string;
}

export interface Draft {
  id: number;
  file_id: number;
  draft_type: string;
  content: string;
  created_at: string;
  claim_number?: string;
  client_name?: string;
}

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
  fileId: number;
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
const DEBUG_MODE = false;

const responseTypeLabels: Record<OutputType, string> = {
  email: "Email Response",
  file: "File",
  escalation: "Escalation Response",
};

/**
 * Core API Helper
 */
async function apiRequest<T>(
  path: string,
  init: RequestInit,
  token?: string,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Missing API_BASE_URL");
  }

  const url = `${API_BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers ?? {}),
  };

  if (DEBUG_MODE) {
    console.log(
      `%c [API REQUEST] ${init.method || "GET"} -> ${url}`,
      "color: #0ea5e9; font-weight: bold",
    );
  }

  try {
    const response = await fetch(url, { ...init, headers });
    const json = await response.json().catch(() => ({}));

    if (DEBUG_MODE) {
      console.log(
        `%c [API RESPONSE] ${response.status} <- ${path}`,
        `color: ${response.ok ? "#10b981" : "#f43f5e"}; font-weight: bold`,
        json,
      );
    }

    if (!response.ok) {
      throw new Error(
        json?.message || `Request failed with status ${response.status}`,
      );
    }

    return json as T;
  } catch (error) {
    console.error(
      `%c [API ERROR] ${path}:`,
      "color: #ef4444; font-weight: bold",
      error,
    );
    throw error;
  }
}

/* --- Auth Actions --- */

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  const data = await apiRequest<AuthApiResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return { token: data.token, email: data.user.email };
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
  return { token: data.token, email: data.user.email };
}

/* --- File & Workspace Actions --- */

export const getMyFiles = async (token: string): Promise<ClaimFile[]> => {
  try {
    const response = await apiRequest<{ success: boolean; files: ClaimFile[] }>(
      "/files/my-files",
      { method: "GET" },
      token,
    );
    return response.files || [];
  } catch (error) {
    throw error;
  }
};

/**
 * UPDATED: Now accepts data from the App Frontend modal
 */
export const createFile = async (
  token: string,
  fileData: CreateFileRequest, // Pass data from the UI
): Promise<{ success: boolean; file: ClaimFile }> => {
  try {
    const response = await apiRequest<{ success: boolean; file: ClaimFile }>(
      "/files/new",
      {
        method: "POST",
        body: JSON.stringify(fileData),
      },
      token,
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export async function getFileDrafts(
  token: string,
  fileId: number,
): Promise<Draft[]> {
  const res = await apiRequest<{ success: boolean; drafts: Draft[] }>(
    `/files/${fileId}/drafts`,
    { method: "GET" },
    token,
  );
  return res.drafts || [];
}

/* --- Generation, Saving & Subscription --- */

export async function generateResponse(
  token: string,
  payload: GenerateResponseRequest,
): Promise<GenerateResponseResult> {
  const res = await apiRequest<{
    success: boolean;
    message: string;
    data: { content: string; fileId: number };
  }>(
    "/drafts/generate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );

  return {
    responseType: payload.type,
    responseTypeLabel: responseTypeLabels[payload.type] || "Response",
    responseText: res.data?.content ?? "No content generated",
    fileId: payload.fileId,
  };
}

export async function saveDraft(
  token: string,
  fileId: number,
  type: OutputType,
  content: string,
): Promise<{ success: boolean; draftId: number }> {
  const res = await apiRequest<{ success: boolean; data: { draftId: number } }>(
    "/drafts/save",
    {
      method: "POST",
      body: JSON.stringify({ fileId, type, content }),
    },
    token,
  );
  return { success: res.success, draftId: res.data.draftId };
}

export async function getSubscriptionStatus(
  token: string,
): Promise<SubscriptionStatus> {
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

export const getRecentDrafts = async (
  token: string,
): Promise<RecentDraft[]> => {
  try {
    const response = await apiRequest<{
      success: boolean;
      data: RecentDraft[];
    }>("/drafts/recent", { method: "GET" }, token);
    return response.data || [];
  } catch (error) {
    console.error("Error fetching recent drafts:", error);
    return [];
  }
};

export const getDraftsByFile = async (
  token: string,
  fileId: number,
): Promise<Draft[]> => {
  try {
    const response = await apiRequest<{ success: boolean; drafts: Draft[] }>(
      `/files/${fileId}/drafts`,
      { method: "GET" },
      token,
    );
    return response.drafts || [];
  } catch (error) {
    console.error(`Error fetching drafts for file ${fileId}:`, error);
    return [];
  }
};

export const AllDraftsofUser = async (token: string): Promise<Draft[]> => {
  const response = await apiRequest<{
    success: boolean;
    data: Draft[];
    count: number;
  }>("/drafts/history", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.success) {
    throw new Error("Failed to fetch draft history");
  }

  // Log only the count as requested
  console.log(`Total Drafts Fetched: ${response.count}`);

  return response.data || []; // Return the .data array
};
