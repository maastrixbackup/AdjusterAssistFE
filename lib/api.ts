import { BASE_URL } from "@/lib/config/apiConfig";

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
  // Primary Identifiers
  id: number;
  user_id: number;
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

  // Derived / UI Fields
  draft_count?: number;
}

// Data structure for creating a new file from the frontend
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
  user_id: number;
  draft_type: string;
  content: string;
  created_at: string;
  claim_number: string;
  client_name: string;
}

export interface ClaimMessage {
  id: number;
  workspace_id: number;
  user_id: number;
  user_input: string;
  ai_response: string;
  content_type: string; // e.g., 'email_insured', 'file_note'
  claim_state: string;
  next_step_suggestion?: string;
  activity_type?: string;
  image_input_url?: string | null;
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
  nextStep?: string;
  logId?: number;
  createdAt?: string;
}

export type GenerateNextStepRequest = {
  fileId: number;
  userInput: string;
  previousResponse: string;
  output_format: string;
};

export type GenerateNextStepResult = {
  next_output_format: string;
  next_step: string;
  rationale?: string;
  source?: string;
  output_format?: string;
  responseText?: string;
  content?: string;
  created_at?: string;
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
  const isFormData = init.body instanceof FormData;
  const headers: any = {
    ...(!isFormData && { "Content-Type": "application/json" }),

    // 2. Add Auth token
    ...(token ? { Authorization: `Bearer ${token}` } : {}),

    // 3. Add any other custom headers
    ...(init.headers ?? {}),
  };

  if (DEBUG_MODE) {
    console.log(`%c [API REQUEST] ${init.method || "GET"} -> ${url}`);
  }

  try {
    const response = await fetch(url, { ...init, headers });
    const json = await response.json().catch(() => ({}));

    if (DEBUG_MODE) {
      console.log(`%c [API RESPONSE] ${response.status} <- ${path}`, json);
    }

    if (!response.ok) {
      throw new Error(
        json?.message || `Request failed with status ${response.status}`,
      );
    }

    return json as T;
  } catch (error) {
    /// Screen error
    // console.error(`%c [API ERROR] ${path}:`, error);
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
): Promise<ClaimMessage[]> {
  const res = await apiRequest<{ success: boolean; drafts: ClaimMessage[] }>(
    `/files/${fileId}/drafts`,
    { method: "GET" },
    token,
  );
  return res.drafts || [];
}

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
    id: res.data.id, // Map the ID from the JSON data
    output_format: res.data.output_format,
    responseTypeLabel: responseTypeLabels[res.data.output_format] || "Response",
    responseText: res.data.ai_response,
    user_input: res.data.user_input,
    fileId: extractedFileId,
    nextStep: res.data.next_step_suggestion,
    // logId: res.data.log_id, // or res.data.id depending on your backend naming
    createdAt: res.data.created_at,
  };
}

export async function generateNextStep(
  token: string,
  payload: {
    fileId: string;
    userInput: string | undefined;
    previousResponse: string;
    output_format: string;
  },
): Promise<GenerateResponseResult> {
  console.log("Chaining workflow for Next Step:", payload);

  const res = await apiRequest<{
    success: boolean;
    message: string;
    data: {
      id: number; // 1. Added id here
      content: string;
      user_input?: string; // 2. Added user_input if backend returns it
      next_step?: string;
      output_format: string;
      log_id?: number;
      created_at?: string;
    };
  }>(
    "/drafts/generate-next-step",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );

  if (!res.success || !res.data) {
    throw new Error(res.message || "Failed to generate next workflow step");
  }

  // Consistent return mapping
  return {
    id: res.data.id, // 3. Map the id to the result
    output_format: res.data.output_format,
    responseTypeLabel:
      responseTypeLabels[res.data.output_format] ||
      res.data.output_format ||
      "Follow-up",
    responseText: res.data.content,
    // 4. Fallback to payload.userInput if the backend doesn't return user_input
    user_input: res.data.user_input || payload.userInput || "Follow-up action",
    fileId: Number(payload.fileId),
    nextStep: res.data.next_step,
    logId: res.data.log_id || res.data.id,
    createdAt: res.data.created_at || new Date().toISOString(),
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

/**
 * Sends the Expo Push Token to the backend.
 * The backend handles user identification via the JWT in the Authorization header.
 */
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
  console.log("REFINE API PAYLOAD: ", payload);
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
  console.log("VARIANT API PAYLOAD: ", payload);
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
