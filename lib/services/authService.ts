import { apiRequest } from "@/lib/services/apiClient";
import { removeToken, saveToken } from "@/lib/utils/storage";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type LoginResponse = {
  success: boolean;
  message?: string;
  requires_mfa: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  token?: string;
  aal?: "aal1" | "aal2";
  requires_mfa_setup?: boolean;
  temp_access_token?: string;
  temp_refresh_token?: string;
  factor_id?: string;
  user?: AuthUser;
};

export type AuthSession = {
  token: string;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  email: string;
  aal?: "aal1" | "aal2";
};

export type MfaTempSession = {
  temp_access_token: string;
  temp_refresh_token: string;
  factor_id?: string;
  email: string;
};

export type LoginResult =
  | { type: "AUTHENTICATED"; session: AuthSession }
  | { type: "MFA_REQUIRED"; mfa: MfaTempSession }
  | { type: "MFA_SETUP_REQUIRED"; mfa: MfaTempSession };

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", "POST", {
    email,
    password,
  });
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<LoginResult> {
  const response = await loginUser(email, password);

  if (response.requires_mfa) {
    if (
      !response.temp_access_token ||
      !response.temp_refresh_token ||
      !response.factor_id
    ) {
      throw new Error("Invalid MFA login response.");
    }
    return {
      type: "MFA_REQUIRED",
      mfa: {
        temp_access_token: response.temp_access_token,
        temp_refresh_token: response.temp_refresh_token,
        factor_id: response.factor_id,
        email: response.user?.email || email,
      },
    };
  }

  if (response.requires_mfa_setup) {
    if (!response.temp_access_token || !response.temp_refresh_token) {
      throw new Error("Invalid MFA setup response.");
    }

    return {
      type: "MFA_SETUP_REQUIRED",
      mfa: {
        temp_access_token: response.temp_access_token,
        temp_refresh_token: response.temp_refresh_token,
        email: response.user?.email || email,
      },
    };
  }

  if (!response.access_token && !response.token) {
    throw new Error("Login token missing.");
  }

  if (!response.refresh_token) {
    throw new Error("Refresh token missing.");
  }

  const session: AuthSession = {
    token: response.access_token || response.token!,
    access_token: response.access_token || response.token!,
    refresh_token: response.refresh_token,
    expires_at: response.expires_at,
    email: response.user?.email || email,
    aal: response.aal || "aal1",
  };

  await saveToken(session.access_token);

  return {
    type: "AUTHENTICATED",
    session,
  };
}

type SignupResponse = {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
  };
};

export async function signupUser(
  name: string,
  email: string,
  role: string,
  password: string,
  acceptedPolicy: boolean,
): Promise<SignupResponse> {
  return apiRequest<SignupResponse>("/auth/signup", "POST", {
    name,
    email,
    role,
    password,
    acceptedPolicy,
  });
}

export async function signupWithEmail(
  name: string,
  email: string,
  role: string,
  password: string,
  acceptedPolicy: boolean,
): Promise<void> {
  await signupUser(name, email, role, password, acceptedPolicy);
}
export type VerifyResetOtpResponse = {
  success: boolean;
  message: string;
  accessToken: string;
};

export type ResetPasswordResponse = {
  success: boolean;
  message: string;
};

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest("/auth/forgot-password", "POST", { email });
}

export async function verifyResetOtp(
  email: string,
  token: string,
): Promise<VerifyResetOtpResponse> {
  return apiRequest<VerifyResetOtpResponse>("/auth/verify-reset-otp", "POST", {
    email,
    token,
  });
}

export async function resetPasswordWithOtp(
  accessToken: string,
  newPassword: string,
): Promise<ResetPasswordResponse> {
  return apiRequest<ResetPasswordResponse>("/auth/reset-password", "POST", {
    accessToken,
    newPassword,
  });
}


export async function logoutUser(): Promise<void> {
  await removeToken();
}

export type RefreshSessionResponse = {
  success: boolean;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  aal?: "aal1" | "aal2";
  user: {
    id: string;
    email: string;
    name?: string;
  };
};

export async function refreshSessionApi(
  refresh_token: string,
): Promise<RefreshSessionResponse> {
  return apiRequest<RefreshSessionResponse>("/auth/refresh", "POST", {
    refresh_token,
  });
}
