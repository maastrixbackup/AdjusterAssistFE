import { BASE_URL } from "@/lib/config/apiConfig";
import {
  clearSessionTokens,
  getRefreshToken,
  getToken,
  saveSessionTokens,
} from "@/lib/utils/storage";
import { router } from "expo-router";

export type AuthSession = {
  token: string;
  email: string;
};

type AuthApiResponse = {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
};

export interface ClaimFile {
  // Primary Identifiers
  id: string;
  user_id: string;
  claim_number: string;
  name?: string; // Optional display name

  // Insurance Metadata (Updated)
  client_name: string;
  policy_form: string;
  address: string;

  // Dates
  date_of_loss: string; // ISO format date
  reported_date: string; // ISO format date

  // Claim Specifics
  loss_type: string; // e.g., 'water', 'fire', 'wind'
  jurisdiction: string; // e.g., 'CT', 'FL', 'NY'
  line_of_business: string; // e.g., 'homeowners', 'commercial'
  claim_stage: string; // e.g., 'mitigation_review', 'adjustment'

  // Status & Metadata
  status: "active" | "closed" | "draft";
  created_at: string;
  updated_at?: string;
  last_activity_at?: string;

  // Derived / UI Fields
  draft_count?: number;
}

export interface CreateFileRequest {
  claim_number: string; // Unique ID for the claim
  client_name: string; // Insured party's name

  address: string; // Property location
  policy_form: string; // e.g., 'HO-3', 'HO-5'
  loss_type: string; // e.g., 'water', 'fire', 'wind'
  jurisdiction: string; // State abbreviation (e.g., 'CT', 'FL')
  line_of_business: string; // e.g., 'homeowners', 'commercial'
  claim_stage: string; // e.g., 'mitigation_review', 'inspection'

  // Dates (Stored as strings from the DatePicker)
  date_of_loss: string;
  reported_date: string;

  // Operational Status
  status: "active" | "archived";
}

export interface RecentDraft {
  id: number;
  file_id: number;
  user_id: string;
  draft_type: string;
  content: string;
  created_at: string;
  claim_number: string;
  client_name: string;
}

export interface ClaimMessage {
  id: number;
  workspace_id: number;
  user_id: string;
  user_input: string;
  ai_response: string;
  content_type: string; // e.g., 'email_insured', 'file_note'
  claim_state: string;
  next_step_suggestion?: string;
  activity_type?: string;
  image_input_url?: string | null;
  documents_url?: string | null;
  quick_actions?: string[]; // JSONB maps to string array
  response_used: boolean;
  metadata?: any;
  created_at: string;
}

export type GenerateResponseRequest = {
  fileId: number | string;
  userInput: string;
  image?: string | null;
};

export interface GenerateResponseResult {
  id: number; // Add this line
  output_format: string;
  responseTypeLabel: string;
  responseText: string;
  user_input: string;
  fileId: number | string;
  next_step_suggestion?: string;
  logId?: number;
  createdAt?: string;

  attachments?: {
    image?: { available: boolean; fileName: string } | null;
    document?: { available: boolean; fileName: string } | null;
  };
}

export type GenerateNextStepRequest = {
  fileId: number;
  userInput: string;
  previousResponse: string;
  output_format: string;
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

const responseTypeLabels: Record<string, string> = {
  file_note: "File",
  email_insured: "Email Response",
  email_contractor: "Contractor Response",
  escalation_response: "Escalation Response",
  supplement_response: "Supplement Response",
  coverage_analysis: "Coverage Analysis",
  denial_support: "Denial Support",
  claim_summary: "Claim Summary",
  xactanalysis_response: "Xact Analysis",
  damage_evaluation: "Damage Evaluation",
  attorney_response: "Attorney Response",
  fnol: "FNOL",
  inspection_summary: "Inspection Summary",
  first_contact_note: "First Contact Note",
  closing_note: "Closing Note",
};

/**
 * Core API Helper
 */
// Color constants for terminal
const DEBUG_MODE = true;
const API_BASE_URL = BASE_URL;

const colors = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function debugLog(color: keyof typeof colors, label: string, data?: unknown) {
  if (!DEBUG_MODE) return;

  console.log(
    `${colors[color]}${colors.bold}[${label}]${colors.reset}`,
    data ?? "",
  );
}

let isLoggingOut = false;
let refreshPromise: Promise<string | null> | null = null;

async function logoutAndRedirect() {
  if (isLoggingOut) return;

  isLoggingOut = true;

  try {
    await clearSessionTokens();
    router.replace("/login");
  } finally {
    setTimeout(() => {
      isLoggingOut = false;
    }, 500);
  }
}

function decodeJwtPayload(token: string) {
  const base64Url = token.split(".")[1];
  if (!base64Url) return null;

  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

  const decoded = decodeURIComponent(
    globalThis
      .atob(base64)
      .split("")
      .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join(""),
  );

  return JSON.parse(decoded);
}

function isJwtExpiringSoon(token?: string | null, bufferSeconds = 300) {
  if (!token) return false;

  try {
    const payload = decodeJwtPayload(token);
    const exp = payload?.exp;
    if (!exp) return true;
    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = exp - now;
    debugLog("cyan", "TOKEN EXPIRY CHECK", {
      secondsLeft,
      expiringSoon: secondsLeft <= bufferSeconds,
    });
    return exp - now <= bufferSeconds;
  } catch {
    return true;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) return null;
    debugLog("yellow", "TOKEN REFRESH STARTED");
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data?.access_token || !data?.refresh_token) {
      debugLog("red", "TOKEN REFRESH FAILED", {
        status: response.status,
        data,
      });
      return null;
    }
    await saveSessionTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    debugLog("green", "TOKEN REFRESH SUCCESS");

    return data.access_token;
  } catch (error) {
    debugLog("red", "TOKEN REFRESH ERROR", error);
    return null;
  }
}

async function getFreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    debugLog(
      "yellow",
      "TOKEN REFRESH WAITING",
      "Using existing refresh request",
    );
    return refreshPromise;
  }

  refreshPromise = refreshAccessToken().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
  retry = true,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Missing API_BASE_URL configuration.");
  }
  const startTime = Date.now();
  const url = `${API_BASE_URL}${path}`;
  const isFormData = init.body instanceof FormData;

  const storedToken = await getToken();
  let accessToken = token || storedToken;
  if (retry && path !== "/auth/refresh" && isJwtExpiringSoon(accessToken)) {
    const refreshedToken = await getFreshAccessToken();
    if (refreshedToken) {
      accessToken = refreshedToken;
    }
  }

  const incomingHeaders = {
    ...(init.headers as Record<string, string>),
  };

  delete incomingHeaders.Authorization;
  delete incomingHeaders.authorization;

  if (isFormData) {
    delete incomingHeaders["Content-Type"];
    delete incomingHeaders["content-type"];
  }

  const headers: Record<string, string> = {
    ...incomingHeaders,
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };
  debugLog("blue", "API REQUEST", {
    method: init.method || "GET",
    path,
    isFormData,
    hasToken: Boolean(accessToken),
    retry,
  });
  const response = await fetch(url, {
    ...init,
    headers,
  });

  const json = await response.json().catch(() => ({}));
  debugLog(response.ok ? "green" : "red", "API RESPONSE", {
    method: init.method || "GET",
    path,
    status: response.status,
    ok: response.ok,
    duration: `${Date.now() - startTime}ms`,
    data: json,
  });

  if (response.status === 401 && retry && path !== "/auth/refresh") {
    debugLog("magenta", "401 RETRY TRIGGERED", { path });
    const newAccessToken = await getFreshAccessToken();

    if (!newAccessToken) {
      await logoutAndRedirect();
      throw new Error("Session expired. Please login again.");
    }

    return apiRequest<T>(path, init, newAccessToken, false);
  }

  if (!response.ok) {
    throw new Error(
      json?.message || `Error ${response.status}: ${response.statusText}`,
    );
  }

  return json as T;
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
  acceptedPolicy: boolean,
): Promise<AuthSession> {
  const data = await apiRequest<AuthApiResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, role, password, acceptedPolicy }),
  });
  return { token: data.token, email: data.user.email };
}

/* --- File & Workspace Actions --- */

export const getMyFiles = async (): Promise<ClaimFile[]> => {
  try {
    const response = await apiRequest<{ success: boolean; files: ClaimFile[] }>(
      "/files/my-files",
      { method: "GET" },
    );
    return response.files || [];
  } catch (error) {
    throw error;
  }
};

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

export async function generateResponse(
  token: string,
  payload: GenerateResponseRequest | FormData,
): Promise<GenerateResponseResult> {
  const isFormData = payload instanceof FormData;

  const res = await apiRequest<{
    success: boolean;
    data: {
      id: number;
      ai_response: string;
      user_input: string;
      output_format: string;
      next_step_suggestion: string;
      created_at: string;
      attachments: {
        image: { available: boolean; fileName: string } | null;
        document: { available: boolean; fileName: string } | null;
      };
    };
  }>(
    "/drafts/generate",
    {
      method: "POST",
      body: isFormData ? payload : JSON.stringify(payload),
    },
    token,
  );

  if (!res.data?.output_format) {
    throw new Error("Backend did not provide output_format");
  }
  let extractedFileId: number | string;
  if (isFormData) {
    const parts = (payload as any)._parts;
    const fileIdPart = parts.find((p: any[]) => p[0] === "fileId");
    extractedFileId = Number(fileIdPart?.[1]);
  } else {
    extractedFileId = (payload as GenerateResponseRequest).fileId;
  }

  return {
    id: res.data.id,
    output_format: res.data.output_format,
    responseTypeLabel:
      responseTypeLabels[res.data.output_format] || res.data.output_format,
    responseText: res.data.ai_response,
    user_input: res.data.user_input,
    fileId: extractedFileId,
    next_step_suggestion: res.data.next_step_suggestion,
    createdAt: res.data.created_at,
    attachments: res.data.attachments,
  };
}

export async function saveDraft(
  token: string,
  fileId: number,
  output_format: string,
  content: string,
): Promise<{ success: boolean; draftId: number }> {
  const res = await apiRequest<{ success: boolean; data: { draftId: number } }>(
    "/drafts/save",
    {
      method: "POST",
      body: JSON.stringify({ fileId, output_format, content }),
    },
    token,
  );
  return { success: res.success, draftId: res.data.draftId };
}

export async function updateDraft(
  token: string,
  id: number | string,
  updateData: Partial<ClaimMessage>,
): Promise<{ success: boolean; data: ClaimMessage }> {
  const res = await apiRequest<{ success: boolean; data: ClaimMessage }>(
    `/drafts/update/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    },
    token,
  );
  // console.log(`Draft ${id} updated successfully:`, res.data);

  return res;
}

export async function deleteDraft(
  token: string,
  draftId: number,
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest<{ success: boolean; message: string }>(
      `/drafts/delete/${draftId}`,
      {
        method: "DELETE",
      },
      token,
    );
    return response;
  } catch (error) {
    console.error(`Error deleting draft ${draftId}:`, error);
    throw error;
  }
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return apiRequest<SubscriptionStatus>("/subscriptions/my-plan", {
    method: "GET",
  });
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

export const getDraftsByFile = async (
  token: string,
  fileId: number,
): Promise<ClaimMessage[]> => {
  try {
    const response = await apiRequest<{
      success: boolean;
      drafts: ClaimMessage[];
    }>(`/files/${fileId}/drafts`, { method: "GET" }, token);
    return response.drafts || [];
  } catch (error) {
    console.error(`Error fetching drafts for file ${fileId}:`, error);
    return [];
  }
};

export const updateFile = async (
  token: string,
  fileId: string | number,
  updateData: {
    claim_number?: string;
    client_name?: string;
    address?: string;
    policy_form?: string;
    date_of_loss?: string;
    reported_date?: string;
    loss_type?: string;
    jurisdiction?: string;
    line_of_business?: string;
    claim_stage?: string;
    status?: "active" | "closed" | "draft";
  },
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data?: any;
    }>(
      `/files/update/${fileId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      },
      token,
    );
    return response;
  } catch (error) {
    console.error(`Error updating file ${fileId}:`, error);
    throw error;
  }
};

export const deleteFile = async (
  token: string,
  fileId: string | number,
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiRequest<{ success: boolean; message: string }>(
      `/files/delete/${fileId}`,
      {
        method: "DELETE",
      },
      token,
    );
    return response;
  } catch (error) {
    console.error(`Error deleting file ${fileId}:`, error);
    throw error;
  }
};

export const getFileById = async (
  token: string,
  fileId: number,
): Promise<ClaimFile> => {
  try {
    const response = await apiRequest<{ success: boolean; file: ClaimFile }>(
      `/files/${fileId}`,
      { method: "GET" },
      token,
    );

    return response.file; // Changed from .data to .file
  } catch (error) {
    console.error("Error in getFileById:", error);
    throw error;
  }
};

export const AllDraftsofUser = async (
  token: string,
): Promise<ClaimMessage[]> => {
  const response = await apiRequest<{
    success: boolean;
    data: ClaimMessage[];
    count: number;
  }>(
    "/drafts/history",
    {
      method: "GET",
    },
    token,
  );

  if (!response.success) {
    throw new Error("Failed to fetch draft history");
  }

  // Log only the count as requested
  debugLog("cyan", "TOTAL DRAFTS FETCHED", response.count);

  return response.data || []; // Return the .data array
};

export async function savePushToken(
  pushToken: string,
  token: string,
): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(
    "/notifications/save-token",
    {
      method: "POST",
      body: JSON.stringify({ pushToken }),
    },
    token,
  );
}

export interface RefinePayload {
  fileId: number;
  parentMessageId: number;
  refinementType: string;
  userInput: string;
}

export type RefineResult = {
  success: boolean;
  data: {
    ai_response: string;
    output_format: string;
    next_step_suggestion: string;
    created_at: string;
    updated_at: string;
  };
};

export const refineResponse = async (
  token: string,
  payload: RefinePayload,
): Promise<RefineResult> => {
  return apiRequest<RefineResult>(
    "/drafts/refine",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
};

export interface VariantPayload {
  fileId: number;
  parentMessageId: number;
  variantLabel: string;
  userInput: string;
}
export type VariantResult = {
  success: boolean;
  data: {
    ai_response: string;
    output_format: string;
    next_step_suggestion: string;
  };
  updated_at?: string;
};

export const generateVariant = async (
  token: string,
  payload: VariantPayload,
): Promise<VariantResult> => {
  return apiRequest<VariantResult>(
    "/drafts/variant",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
};
export type UpdateUserPayload = {
  name?: string;
  phone?: number;
  company?: string;
  avatar_url?: string;
  expo_push_token?: string;
};

export type UpdateUserResponse = {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
    updated_at: string;
    phone?: number;
    company?: string;
    avatar_url?: string;
    expo_push_token?: string;
    is_signature_enabled?: boolean;
    push_enabled: boolean;
    signature_details?: {
      name?: string;
      designation?: string;
      company?: string;
      phone?: string;
      email?: string;
    };
  };
};

export async function updateUserProfile(
  payload: UpdateUserPayload | FormData,
  token: string,
): Promise<UpdateUserResponse> {
  const isFormData = payload instanceof FormData;
  return apiRequest<UpdateUserResponse>(
    "/user/update",
    {
      method: "PATCH",
      body: isFormData ? payload : JSON.stringify(payload),
    },
    token,
  );
}

export async function getProfile(): Promise<UpdateUserResponse> {
  return apiRequest<UpdateUserResponse>("/user/profile", {
    method: "GET",
  });
}

export const getAttachmentPreview = async (
  token: string,
  messageId: number,
  type: "image" | "document",
): Promise<{ success: boolean; signedUrl: string }> => {
  try {
    const response = await apiRequest<{
      success: boolean;
      signedUrl: string;
    }>(`/drafts/${messageId}/attachments/${type}`, { method: "GET" }, token);

    return response;
  } catch (error) {
    console.error(`Error fetching ${type} preview:`, error);
    throw error;
  }
};

export interface ResendVerificationPayload {
  email: string;
}

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
}

export async function resendVerificationEmail(
  payload: ResendVerificationPayload,
): Promise<ResendVerificationResponse> {
  return apiRequest<ResendVerificationResponse>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCreditUsageHistory(
  token: string,
  range: "24h" | "week" | "month" | "year" | "all" = "all",
  page = 1,
  limit = 30,
) {
  return apiRequest(
    `/subscriptions/history?range=${range}&page=${page}&limit=${limit}`,
    {
      method: "GET",
    },
    token,
  );
}

export type DashboardBootstrapResponse = {
  success: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
    company?: string;
    avatar_url?: string | null;
    expo_push_token?: string | null;
    push_enabled?: boolean;
    is_signature_enabled?: boolean;
    signature_details?: any;
    accepted_policies?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  files: ClaimFile[];
  file_count: number;
  subscription: {
    plan_type: string;
    usage_limit: number;
    current_usage: number;
    expires_at: string;
    remaining: number;
    is_unlimited: boolean;
    status?: string;
  } | null;
};

export async function getDashboardBootstrap(token: string) {
  return apiRequest<DashboardBootstrapResponse>(
    "/dashboard/bootstrap",
    { method: "GET" },
    token,
  );
}

export async function deleteAccount(params: {
  confirmation: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest("/user/delete-account", {
    method: "DELETE",
    body: JSON.stringify({
      confirmation: params.confirmation,
    }),
  });
}