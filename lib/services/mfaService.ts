// lib/services/mfaService.ts
import { AuthSession } from "@/lib/services/authService";

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

// const DEBUG_MODE =
//   process.env.EXPO_PUBLIC_DEBUG_MODE === "true" ||
//   process.env.EXPO_PUBLIC_DEBUG_MODE === "1";

const DEBUG_MODE = false;

if (!BASE_URL) {
  console.log("\x1b[31m[MFA BASE URL]: MISSING\x1b[0m");
  throw new Error("API base URL missing");
}

const colors = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

function buildUrl(path: string) {
  const cleanBase = BASE_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}

function maskToken(token?: string) {
  if (!token) return null;
  if (token.length <= 18) return "***";
  return `${token.slice(0, 10)}...${token.slice(-8)}`;
}

function logRequest(params: {
  url: string;
  method: string;
  accessToken: string;
  body?: Record<string, unknown>;
}) {
  if (!DEBUG_MODE) return;

  console.log(`${colors.cyan}[MFA REQUEST]${colors.reset}`, {
    method: params.method,
    url: params.url,
    authorization: `Bearer ${maskToken(params.accessToken)}`,
    body: params.body
      ? {
          ...params.body,
          temp_access_token: maskToken(
            params.body.temp_access_token as string | undefined,
          ),
          temp_refresh_token: maskToken(
            params.body.temp_refresh_token as string | undefined,
          ),
        }
      : undefined,
  });
}

function logResponse(params: {
  url: string;
  method: string;
  status: number;
  ok: boolean;
  data: unknown;
}) {
  if (!DEBUG_MODE) return;

  const color = params.ok ? colors.green : colors.red;

  console.log(`${color}[MFA RESPONSE]${colors.reset}`, {
    method: params.method,
    url: params.url,
    status: params.status,
    ok: params.ok,
    data: params.data,
  });
}

function logRawError(params: {
  url: string;
  method: string;
  status: number;
  raw: string;
}) {
  if (!DEBUG_MODE) return;

  console.log(`${colors.red}[MFA RAW RESPONSE]${colors.reset}`, {
    method: params.method,
    url: params.url,
    status: params.status,
    raw: params.raw,
  });
}

async function mfaRequest<T>(
  path: string,
  method: "GET" | "POST",
  accessToken: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = buildUrl(path);

  logRequest({
    url,
    method,
    accessToken,
    body,
  });

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await response.text();
  let data: any;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    logRawError({
      url,
      method,
      status: response.status,
      raw,
    });

    throw new Error(raw || "Invalid server response");
  }
  logResponse({
    url,
    method,
    status: response.status,
    ok: response.ok,
    data,
  });

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || "Request failed");
  }

  return data as T;
}

export type EnrollMFAResponse = {
  success: boolean;
  factor_id: string;
  qr_code: string;
  secret: string;
  uri: string;
};

export type ChallengeMFAResponse = {
  success: boolean;
  challenge_id: string;
  message?: string;
};

type VerifyEnrollmentRawResponse = {
  success: boolean;
  message: string;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  token?: string;
  aal?: "aal1" | "aal2";
  user: {
    id: string;
    email: string;
    name?: string;
  };
  recovery_codes?: string[];
};

type VerifyLoginRawResponse = {
  success: boolean;
  message: string;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  token?: string;
  aal?: "aal1" | "aal2";
  user: {
    id: string;
    email: string;
    name?: string;
  };
};

export async function enrollMFA(params: { temp_access_token: string }) {
  return mfaRequest<EnrollMFAResponse>(
    "/auth/mfa/enroll",
    "GET",
    params.temp_access_token,
  );
}

export async function verifyMFAEnrollment(params: {
  factor_id: string;
  code: string;
  temp_access_token: string;
}): Promise<AuthSession & { recovery_codes?: string[] }> {
  const response = await mfaRequest<VerifyEnrollmentRawResponse>(
    "/auth/mfa/verify",
    "POST",
    params.temp_access_token,
    {
      factor_id: params.factor_id,
      code: params.code,
    },
  );

  const accessToken = response.access_token || response.token;
  const refreshToken = response.refresh_token;

  if (!accessToken || !refreshToken) {
    throw new Error("MFA verified but session tokens are missing.");
  }

  return {
    token: accessToken,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: response.expires_at,
    email: response.user.email,
    aal: "aal2",
    recovery_codes: response.recovery_codes || [],
  };
}

export async function challengeMFALogin(params: {
  factor_id: string;
  temp_access_token: string;
  temp_refresh_token: string;
}) {
  return mfaRequest<ChallengeMFAResponse>(
    "/auth/mfa/challenge",
    "POST",
    params.temp_access_token,
    {
      factor_id: params.factor_id,
      temp_access_token: params.temp_access_token,
      temp_refresh_token: params.temp_refresh_token,
    },
  );
}

export async function verifyMFALogin(params: {
  factor_id: string;
  challenge_id: string;
  code: string;
  temp_access_token: string;
  temp_refresh_token: string;
}): Promise<AuthSession> {
  const response = await mfaRequest<VerifyLoginRawResponse>(
    "/auth/mfa/verify-login",
    "POST",
    params.temp_access_token,
    {
      factor_id: params.factor_id,
      challenge_id: params.challenge_id,
      code: params.code,
      temp_access_token: params.temp_access_token,
      temp_refresh_token: params.temp_refresh_token,
    },
  );

  return {
    token: response.access_token || response.token!,
    access_token: response.access_token || response.token!,
    refresh_token: response.refresh_token,
    expires_at: response.expires_at,
    email: response.user.email,
    aal: "aal2",
  };
}

export type ResetMFALoginResponse = {
  success: boolean;
  message: string;
  temp_access_token?: string;
  temp_refresh_token?: string;
};

export async function resetMFALogin(params: {
  email: string;
  password: string;
  temp_access_token: string;
}) {
  return mfaRequest<ResetMFALoginResponse>(
    "/auth/mfa/reset-login",
    "POST",
    params.temp_access_token,
    {
      email: params.email,
      password: params.password,
      temp_access_token: params.temp_access_token,
    },
  );
}

export async function recoveryCodeLogin(params: {
  recovery_code: string;
  temp_access_token: string;
}) {
  return mfaRequest<{
    success: boolean;
    message: string;
    recovery_used: boolean;
    requires_mfa: boolean;
    requires_mfa_setup: boolean;
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
    token_type: string;
    user: {
      id: string;
      email: string;
    };
  }>("/auth/mfa/recovery-login", "POST", params.temp_access_token, {
    recovery_code: params.recovery_code,
  });
}

export async function requestMFARecovery(params: {
  temp_access_token: string;
}) {
  return mfaRequest<{
    success: boolean;
    message: string;
  }>("/auth/mfa/recovery-request", "POST", params.temp_access_token);
}
