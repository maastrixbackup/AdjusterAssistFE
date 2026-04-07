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
  // Required Claim Identifiers
  claim_number: string; // Unique ID for the claim
  client_name: string; // Insured party's name

  // Mandatory Insurance Metadata
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
  userInput: string;
  image?: string | null;
  task_type: string;
};

export type GenerateResponseResult = {
  output_format: string;
  responseTypeLabel: string;
  responseText: string;
  fileId: number;
  nextStep?: string;
  logId?: number;
  createdAt?: string;
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
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  console.log("Generating response with payload:", payload);

  const res = await apiRequest<{
    success: boolean;
    message: string;
    data: {
      content: string;
      output_format: string;
      next_step?: string;
      log_id?: number;
      created_at?: string;
    };
  }>(
    "/drafts/generate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );

  if (!res.data?.output_format) {
    throw new Error("Backend did not provide output_format");
  }

  const outputType = res.data.output_format;

  return {
    output_format: outputType,
    responseTypeLabel:
      responseTypeLabels[outputType] || res.data.output_format || "Response",
    responseText: res.data.content,
    fileId: payload.fileId,
    nextStep: res.data.next_step,
    logId: res.data.log_id,
    createdAt: res.data.created_at,
  };
}

export async function saveDraft(
  token: string,
  fileId: number,
  type: string,
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

export async function updateDraft(
  token: string,
  draftId: number | string,
  updateData: { content?: string; draft_type?: string },
): Promise<{ success: boolean; draftId: number }> {
  const res = await apiRequest<{ success: boolean; data: { draftId: number } }>(
    `/drafts/update/${draftId}`,
    {
      method: "PUT",
      body: JSON.stringify(updateData),
    },
    token,
  );
  return { success: res.success, draftId: res.data.draftId };
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
    status?: "active" | "closed";
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
