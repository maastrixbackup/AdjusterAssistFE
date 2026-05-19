import { BASE_URL } from "@/lib/config/apiConfig";

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
  supplement_response: "Suplement Response",
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
const colors = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
};
const API_BASE_URL = BASE_URL;
const DEBUG_MODE = false; // Set to true to see logs during development

async function apiRequest<T>(
  path: string,
  init: RequestInit,
  token?: string,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Missing API_BASE_URL configuration.");
  }
  const url = `${API_BASE_URL}${path}`;
  const isFormData = init.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(init.headers as Record<string, string>),
  };

  // 3. Debug Request Log
  if (DEBUG_MODE) {
    const method = init.method || "GET";
    console.log(
      `${colors.bold}${colors.blue}[API REQUEST] ${method} -> ${url}${colors.reset}`,
    );
    if (init.body && !isFormData) {
      console.log("Payload:", JSON.parse(init.body as string));
    }
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
    });

    const json = await response.json().catch(() => ({}));

    // 4. Debug Response Log
    if (DEBUG_MODE) {
      const color = response.ok ? colors.green : colors.red;
      console.log(
        `${colors.bold}${color}[API RESPONSE] ${response.status} <- ${path}${colors.reset}`,
        json,
      );
    }

    if (!response.ok) {
      // Use backend message or fallback to status text
      throw new Error(
        json?.message || `Error ${response.status}: ${response.statusText}`,
      );
    }

    return json as T;
  } catch (error: any) {
    if (DEBUG_MODE) {
      console.log(
        `${colors.bold}${colors.red}[API ERROR] ${path}:${colors.reset}`,
        error.message,
      );
    }
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
  acceptedPolicy: boolean,
): Promise<AuthSession> {
  const data = await apiRequest<AuthApiResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, role, password, acceptedPolicy }),
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
        // Added
        image: { available: boolean; fileName: string } | null;
        document: { available: boolean; fileName: string } | null;
      };
    };
  }>(
    "/drafts/generate",
    {
      method: "POST",
      body: isFormData ? payload : JSON.stringify(payload),
      // We pass custom headers here, but apiRequest MUST not override them with JSON
      headers: isFormData ? { Authorization: `Bearer ${token}` } : undefined,
    },
    token,
  );

  if (!res.data?.output_format) {
    throw new Error("Backend did not provide output_format");
  }
  // Type-safe extraction of fileId for the return object
  let extractedFileId: number | string;
  if (isFormData) {
    // Access the internal parts array safely using 'any'
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

export const refineResponse = async (token: string, payload: RefinePayload) => {
  // console.log("REFINE API PAYLOAD: ", payload);
  const response = await fetch(`${BASE_URL}/drafts/refine`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("Refinement failed");
  return await response.json();
};

export interface VariantPayload {
  fileId: number;
  parentMessageId: number;
  variantLabel: string;
  userInput: string;
}

export const generateVariant = async (
  token: string,
  payload: VariantPayload,
) => {
  // console.log("VARIANT API PAYLOAD: ", payload);
  const response = await fetch(`${BASE_URL}/drafts/variant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Variant generation failed");
  }
  return await response.json();
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

export async function getProfile(token: string): Promise<UpdateUserResponse> {
  return apiRequest<UpdateUserResponse>(
    "/user/profile",
    {
      method: "GET",
    },
    token,
  );
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

export interface UsageHistoryResponse {
  success: boolean;
  meta: {
    runInPeriod: number;
    remaining: number;
    nextRenewal: string;
    planStatus: string;
  };
  transactions: {
    id: string;
    title: string;
    workspace: string;
    cost: string;
    timestamp: string;
  }[];
}

export const getCreditUsageHistory = async (
  token: string,
  range: "24h" | "week" | "month" | "year" | "all" = "all",
): Promise<UsageHistoryResponse> => {
  try {
    return await apiRequest<UsageHistoryResponse>(
      `/subscriptions/history?range=${range}`,
      { method: "GET" },
      token,
    );
  } catch (error) {
    console.error(`Error fetching credit usage history (${range}):`, error);
    throw error;
  }
};
