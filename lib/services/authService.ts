import { removeToken, saveToken } from "@/lib/utils/storage";
import { apiRequest } from "@/lib/services/apiClient";

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

export type AuthSession = {
  token: string;
  email: string;
};

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthApiResponse> {
  const response = await apiRequest<AuthApiResponse>("/auth/login", "POST", {
    email,
    password,
  });

  if (response.token) {
    await saveToken(response.token);
  }

  return response;
}

export async function signupUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthApiResponse> {
  const response = await apiRequest<AuthApiResponse>("/auth/signup", "POST", {
    name,
    email,
    password,
  });

  return response;
}

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

export async function signupWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  await signupUser(name, email, password);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest("/auth/forgot-password", "POST", { email });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await apiRequest("/auth/reset-password", "POST", {
    token,
    newPassword,
  });
}

export async function logoutUser(): Promise<void> {
  await removeToken();
}
