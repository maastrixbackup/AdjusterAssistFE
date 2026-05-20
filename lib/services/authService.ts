import { apiRequest } from "@/lib/services/apiClient";
import { removeToken, saveToken } from "@/lib/utils/storage";

type AuthApiResponse = {
  success: boolean;
  message: string;
  user: {
    id: string;
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

  if (response.success && response.token) {
    await saveToken(response.token);
  }

  return response;
}

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
    await saveToken(response.token);
  }

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
  role: string,
  password: string,
  acceptedPolicy: boolean,
): Promise<void> {
  await signupUser(name, email, role, password, acceptedPolicy);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest("/auth/forgot-password", "POST", { email });
}

export async function logoutUser(): Promise<void> {
  await removeToken();
}
