import { apiRequest } from "@/lib/services/apiClient";
import { removeToken, saveToken } from "@/lib/utils/storage";

// UPDATED: id is now a string (UUID)
type AuthApiResponse = {
  success: boolean;
  message: string;
  user: {
    id: string; // Changed from number to string
    name: string;
    email: string;
  };
  token: string;
};

export type AuthSession = {
  token: string;
  email: string;
};

/**
 * Handle Login
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<AuthApiResponse> {
  const response = await apiRequest<AuthApiResponse>("/auth/login", "POST", {
    email,
    password,
  });

  // Ensure we persist the Supabase JWT
  if (response.success && response.token) {
    await saveToken(response.token);
  }

  return response;
}

/**
 * Handle Signup
 */
export async function signupUser(
  name: string,
  email: string,
  role: string,
  password: string,
  acceptedPolicy: boolean,
): Promise<AuthApiResponse> {
  const response = await apiRequest<AuthApiResponse>("/auth/signup", "POST", {
    name,
    email,
    role,
    password,
    acceptedPolicy,
  });

  if (response.success && response.token) {
    console.log("Signup successful, saving token...", response.token);
    await saveToken(response.token);
  }

  return response;
}

/**
 * Helper: Login and return session details
 */
export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  const response = await loginUser(email, password);
  return {
    token: response.token,
    email: response.user.email,
  };
}

/**
 * Helper: Simple Signup wrapper
 */
export async function signupWithEmail(
  name: string,
  email: string,
  role: string,
  password: string,
  acceptedPolicy: boolean,
): Promise<void> {
  await signupUser(name, email, role, password, acceptedPolicy);
}

/**
 * Password Management
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest("/auth/forgot-password", "POST", { email });
}

export async function verifyPasswordResetOtp(
  email: string,
  otp: string,
): Promise<void> {
  await apiRequest("/auth/verify", "POST", { email, otp });
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
): Promise<void> {
  await apiRequest("/auth/reset-password", "POST", {
    email,
    otp,
    newPassword,
  });
}

/**
 * Clear Local Storage / Logout
 */
export async function logoutUser(): Promise<void> {
  await removeToken();
}
